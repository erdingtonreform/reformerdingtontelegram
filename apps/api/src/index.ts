import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { PrismaClient } from '@prisma/client';
import { rbacMiddleware, adminOnly, wardLeadOrAdmin } from './auth';

const prisma = new PrismaClient();

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const app = Fastify({ logger: true });

// Register plugins
await app.register(cors, {
  origin: true, // Allow all origins for now
});
await app.register(multipart);

// Rate limiting - different limits for different endpoints
await app.register(rateLimit, {
  max: 100, // 100 requests per window
  timeWindow: '1 minute',
  keyGenerator: (request) => {
    // Use IP address for rate limiting
    return request.ip;
  },
  // Skip rate limiting for health checks
  skipOnError: true,
});

// Specific rate limiting for auth endpoints
app.addHook('preHandler', async (request, reply) => {
  if (request.url.startsWith('/api/auth') || request.url.includes('signin')) {
    // Stricter limits for auth endpoints
    const rateLimitKey = `auth_${request.ip}`;
    // Simple in-memory rate limiting for now - in production use Redis
    const attempts = (global as any).authAttempts || {};
    const now = Date.now();
    const windowStart = now - 15 * 60 * 1000; // 15 minutes

    if (!attempts[rateLimitKey]) {
      attempts[rateLimitKey] = [];
    }

    // Clean old attempts
    attempts[rateLimitKey] = attempts[rateLimitKey].filter((time: number) => time > windowStart);

    if (attempts[rateLimitKey].length >= 5) {
      return reply.code(429).send({ error: 'Too many authentication attempts. Try again later.' });
    }

    attempts[rateLimitKey].push(now);
    (global as any).authAttempts = attempts;
  }
});

// Routes
app.get('/health', async () => {
  return { status: 'ok' };
});

// Export app for testing
export { app };

// Posts CRUD (admin only)
app.get('/api/posts', { preHandler: adminOnly }, async (request, reply) => {
  const posts = await prisma.post.findMany({
    include: { media: true },
    orderBy: { createdAt: 'desc' },
  });
  return posts;
});

app.post('/api/posts', { preHandler: adminOnly }, async (request, reply) => {
  const { type, title, content, utmUrl } = request.body as any;
  const post = await prisma.post.create({
    data: { type, title, content, utmUrl },
  });
  return post;
});

app.put('/api/posts/:id', { preHandler: adminOnly }, async (request, reply) => {
  const { id } = request.params as any;
  const { type, title, content, utmUrl } = request.body as any;
  const post = await prisma.post.update({
    where: { id },
    data: { type, title, content, utmUrl },
  });
  return post;
});

app.delete('/api/posts/:id', { preHandler: adminOnly }, async (request, reply) => {
  const { id } = request.params as any;
  await prisma.post.delete({
    where: { id },
  });
  return { success: true };
});

// Post approval and scheduling
app.post('/api/posts/:id/approve', { preHandler: adminOnly }, async (request, reply) => {
  const { id } = request.params as any;
  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) {
    return reply.code(404).send({ error: 'Post not found' });
  }
  if (post.status !== 'DRAFT') {
    return reply.code(400).send({ error: 'Post must be in DRAFT status to be approved' });
  }
  const updatedPost = await prisma.post.update({
    where: { id },
    data: {
      status: 'READY',
      approvedBy: request.user!.id,
      approvedAt: new Date(),
    },
  });
  return updatedPost;
});

app.post('/api/posts/:id/schedule', { preHandler: adminOnly }, async (request, reply) => {
  const { id } = request.params as any;
  const { scheduledAt } = request.body as any;
  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) {
    return reply.code(404).send({ error: 'Post not found' });
  }
  if (post.status !== 'READY') {
    return reply.code(400).send({ error: 'Post must be in READY status to be scheduled' });
  }
  const updatedPost = await prisma.post.update({
    where: { id },
    data: {
      status: 'SCHEDULED',
      scheduledAt: new Date(scheduledAt),
    },
  });
  return updatedPost;
});

app.post('/api/posts/:id/send', { preHandler: adminOnly }, async (request, reply) => {
  const { id } = request.params as any;
  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) {
    return reply.code(404).send({ error: 'Post not found' });
  }
  if (post.status !== 'SCHEDULED') {
    return reply.code(400).send({ error: 'Post must be in SCHEDULED status to be sent' });
  }
  const updatedPost = await prisma.post.update({
    where: { id },
    data: {
      status: 'SENT',
      postedAt: new Date(),
    },
  });
  return updatedPost;
});

// Media upload
app.post('/api/media/upload', { preHandler: adminOnly }, async (request, reply) => {
  const data = await request.file();
  if (!data) {
    return reply.code(400).send({ error: 'No file uploaded' });
  }

  const { postId } = request.query as any;
  if (!postId) {
    return reply.code(400).send({ error: 'Post ID required' });
  }

  const fileBuffer = await data.toBuffer();
  const fileName = `${Date.now()}-${data.filename}`;
  const key = `posts/${postId}/${fileName}`;

  const upload = new Upload({
    client: s3Client,
    params: {
      Bucket: process.env.S3_BUCKET || 'telegram-media',
      Key: key,
      Body: fileBuffer,
      ContentType: data.mimetype,
      ACL: 'public-read',
    },
  });

  await upload.done();

  const url = `${process.env.S3_PUBLIC_URL || 'https://s3.amazonaws.com/telegram-media'}/${key}`;

  const media = await prisma.media.create({
    data: {
      postId,
      url,
      type: data.mimetype.startsWith('image/') ? 'image' : data.mimetype.startsWith('video/') ? 'video' : 'document',
      filename: data.filename,
      size: fileBuffer.length,
    },
  });

  return media;
});

// Events CRUD (ward leads can manage their ward's events)
app.get('/api/events', { preHandler: wardLeadOrAdmin }, async (request, reply) => {
  const events = await prisma.event.findMany({
    where: request.user?.role === 'ward_lead' ? { wardSlug: request.user.wardSlug } : {},
    include: {
      rotaSlots: {
        include: { assignedMember: true }
      }
    },
    orderBy: { startTs: 'asc' },
  });
  return events;
});

app.post('/api/events', { preHandler: wardLeadOrAdmin }, async (request, reply) => {
  const { title, startTs, endTs, location, wardSlug } = request.body as any;

  // Ward leads can only create events for their ward
  if (request.user?.role === 'ward_lead' && wardSlug !== request.user.wardSlug) {
    return reply.code(403).send({ error: 'Cannot create events for other wards' });
  }

  const event = await prisma.event.create({
    data: {
      title,
      startTs: new Date(startTs),
      endTs: endTs ? new Date(endTs) : null,
      location,
      wardSlug
    }
  });

  // Generate default rota slots
  const defaultSlots = [
    { role: 'Gazebo', required: true },
    { role: 'Table', required: true },
    { role: 'Flags', required: true },
    { role: 'QR Banner', required: true },
    { role: 'Leaflets', required: true },
    { role: 'Pens', required: true },
    { role: 'Wipes', required: true }
  ];

  for (const slot of defaultSlots) {
    await prisma.rotaSlot.create({
      data: { ...slot, eventId: event.id }
    });
  }

  // Return event with rota slots
  const eventWithSlots = await prisma.event.findUnique({
    where: { id: event.id },
    include: { rotaSlots: true }
  });

  return eventWithSlots;
});

app.put('/api/events/:id', { preHandler: wardLeadOrAdmin }, async (request, reply) => {
  const { id } = request.params as any;
  const { title, startTs, endTs, location, wardSlug } = request.body as any;
// Rota slot assignment
app.put('/api/events/:eventId/slots/:slotId/assign', { preHandler: wardLeadOrAdmin }, async (request, reply) => {
  const { eventId, slotId } = request.params as any;
  const { memberId } = request.body as any;

  // Check if user can modify this event
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    return reply.code(404).send({ error: 'Event not found' });
  }

  if (request.user?.role === 'ward_lead' && event.wardSlug !== request.user.wardSlug) {
    return reply.code(403).send({ error: 'Cannot modify events for other wards' });
  }

  const slot = await prisma.rotaSlot.update({
    where: { id: slotId },
    data: {
      assignedMemberId: memberId || null,
      assignedAt: memberId ? new Date() : null
    },
    include: { assignedMember: true }
  });

  return slot;
});

// Publish rota to volunteer group
app.post('/api/events/:id/publish-rota', { preHandler: wardLeadOrAdmin }, async (request, reply) => {
  const { id } = request.params as any;

  // Check if user can modify this event
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      rotaSlots: {
        include: { assignedMember: true }
      }
    }
  });
  if (!event) {
    return reply.code(404).send({ error: 'Event not found' });
  }

  if (request.user?.role === 'ward_lead' && event.wardSlug !== request.user.wardSlug) {
    return reply.code(403).send({ error: 'Cannot publish rota for other wards' });
  }

  // Check if all required slots are assigned
  const unassignedRequired = event.rotaSlots.filter(slot => slot.required && !slot.assignedMemberId);
  if (unassignedRequired.length > 0) {
    return reply.code(400).send({
      error: 'Cannot publish rota: some required slots are unassigned',
      unassignedSlots: unassignedRequired.map(slot => slot.role)
    });
  }

  // Here you would integrate with Telegram bot to send message to volunteer group
  // For now, just mark as published
  await prisma.event.update({
    where: { id },
    data: { publishedAt: new Date() }
  });

  // Generate checklist message
  const checklistItems = event.rotaSlots.map(slot =>
    `- ${slot.role}: ${slot.assignedMember ? `${slot.assignedMember.firstName} ${slot.assignedMember.lastName || ''}`.trim() : 'Unassigned'}`
  ).join('\n');

  const message = `📋 Event Rota Published: ${event.title}\n\nDate: ${event.startTs.toLocaleDateString()}\nLocation: ${event.location || 'TBD'}\n\nAssigned Volunteers:\n${checklistItems}\n\nPlease bring your assigned items to the event!`;

  // TODO: Send to Telegram volunteer group via bot API

  return {
    success: true,
    message: 'Rota published to volunteer group',
    checklist: message
  };
});

// Get members for slot assignment (ward leads see their ward members)
app.get('/api/members-for-slots', { preHandler: wardLeadOrAdmin }, async (request, reply) => {
  const members = await prisma.member.findMany({
    where: {
      status: 'APPROVED',
      ...(request.user?.role === 'ward_lead' ? { wardSlug: request.user.wardSlug } : {})
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      username: true
    },
    orderBy: { firstName: 'asc' }
  });
  return members;
});

  // Check if user can modify this event
  const existingEvent = await prisma.event.findUnique({ where: { id } });
  if (!existingEvent) {
    return reply.code(404).send({ error: 'Event not found' });
  }

  if (request.user?.role === 'ward_lead' && existingEvent.wardSlug !== request.user.wardSlug) {
    return reply.code(403).send({ error: 'Cannot modify events for other wards' });
  }

  const event = await prisma.event.update({
    where: { id },
    data: { title, startTs: new Date(startTs), endTs: endTs ? new Date(endTs) : null, location, wardSlug },
    include: { rotaSlots: { include: { assignedMember: true } } }
  });
  return event;
});

app.delete('/api/events/:id', { preHandler: wardLeadOrAdmin }, async (request, reply) => {
  const { id } = request.params as any;

  // Check if user can delete this event
  const existingEvent = await prisma.event.findUnique({ where: { id } });
  if (!existingEvent) {
    return reply.code(404).send({ error: 'Event not found' });
  }

  if (request.user?.role === 'ward_lead' && existingEvent.wardSlug !== request.user.wardSlug) {
    return reply.code(403).send({ error: 'Cannot delete events for other wards' });
  }

  await prisma.event.delete({
    where: { id },
  });
  return { success: true };
});

// Forms CRUD (admin only)
app.get('/api/forms', { preHandler: adminOnly }, async (request, reply) => {
  const forms = await prisma.form.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  });
  return forms;
});

app.post('/api/forms', { preHandler: adminOnly }, async (request, reply) => {
  const { title, description, fields } = request.body as any;
  const form = await prisma.form.create({
    data: { title, description, fields },
  });
  return form;
});

app.put('/api/forms/:id', { preHandler: adminOnly }, async (request, reply) => {
  const { id } = request.params as any;
  const { title, description, fields, isActive } = request.body as any;
  const form = await prisma.form.update({
    where: { id },
    data: { title, description, fields, isActive },
  });
  return form;
});

app.delete('/api/forms/:id', { preHandler: adminOnly }, async (request, reply) => {
  const { id } = request.params as any;
  await prisma.form.update({
    where: { id },
    data: { isActive: false },
  });
  return { success: true };
});

app.get('/api/forms/:id/submissions', { preHandler: adminOnly }, async (request, reply) => {
  const { id } = request.params as any;
  const submissions = await prisma.formSubmission.findMany({
    where: { formId: id },
    include: { member: true },
    orderBy: { submittedAt: 'desc' },
  });
  return submissions;
});

// Analytics (admin only)
app.get('/api/analytics/posts', { preHandler: adminOnly }, async (request, reply) => {
  const analytics = await prisma.post.aggregate({
    _count: { id: true },
    _sum: { views: true, clicks: true },
  });
  return {
    totalPosts: analytics._count.id,
    totalViews: analytics._sum.views,
    totalClicks: analytics._sum.clicks,
  };
});

app.get('/api/analytics/members', { preHandler: adminOnly }, async (request, reply) => {
  const totalMembers = await prisma.member.count();
  const approvedMembers = await prisma.member.count({ where: { status: 'APPROVED' } });
  const pendingMembers = await prisma.member.count({ where: { status: 'PENDING' } });

  const weeklyNewMembers = await prisma.member.count({
    where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }
  });

  const monthlyNewMembers = await prisma.member.count({
    where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }
  });

  return {
    totalMembers,
    approvedMembers,
    pendingMembers,
    weeklyNewMembers,
    monthlyNewMembers
  };
});

app.get('/api/analytics/events', { preHandler: adminOnly }, async (request, reply) => {
  const totalEvents = await prisma.event.count();
  const upcomingEvents = await prisma.event.count({
    where: { startTs: { gte: new Date() } }
  });

  const weeklyEvents = await prisma.event.count({
    where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }
  });

  const rotaAssignments = await prisma.rotaSlot.count({
    where: { assignedMemberId: { not: null } }
  });

  return {
    totalEvents,
    upcomingEvents,
    weeklyEvents,
    rotaAssignments
  };
});

app.get('/api/analytics/moderation', { preHandler: adminOnly }, async (request, reply) => {
  const totalActions = await prisma.moderationAction.count();

  const weeklyActions = await prisma.moderationAction.count({
    where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }
  });

  const actionBreakdown = await prisma.moderationAction.groupBy({
    by: ['action'],
    _count: { id: true }
  });

  return {
    totalActions,
    weeklyActions,
    actionBreakdown
  };
});

app.get('/api/analytics/forms', { preHandler: adminOnly }, async (request, reply) => {
  const totalForms = await prisma.form.count({ where: { isActive: true } });
  const totalSubmissions = await prisma.formSubmission.count();

  const weeklySubmissions = await prisma.formSubmission.count({
    where: { submittedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }
  });

  return {
    totalForms,
    totalSubmissions,
    weeklySubmissions
  };
});

// Moderation (admin only)
app.get('/api/moderation/actions', { preHandler: adminOnly }, async (request, reply) => {
  const actions = await prisma.moderationAction.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  return actions;
});

app.post('/api/moderation/actions', { preHandler: adminOnly }, async (request, reply) => {
  const { action, targetUserId, moderatorId, reason, duration } = request.body as any;
  const moderationAction = await prisma.moderationAction.create({
    data: { action, targetUserId, moderatorId, reason, duration },
  });
  return moderationAction;
});

// Settings (admin only)
app.get('/api/settings/:key', { preHandler: adminOnly }, async (request, reply) => {
  const { key } = request.params as any;
  const setting = await prisma.setting.findUnique({
    where: { key },
  });
  return setting?.value || null;
});

app.put('/api/settings/:key', { preHandler: adminOnly }, async (request, reply) => {
  const { key } = request.params as any;
  const { value } = request.body as any;
  const setting = await prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
  return setting;
});

// Members (admin only)
app.get('/api/members', { preHandler: adminOnly }, async (request, reply) => {
  const members = await prisma.member.findMany({
    orderBy: { createdAt: 'desc' },
  });
  return members;
});

// Join Requests (ward leads can see their ward's requests)
app.get('/api/join-requests', { preHandler: wardLeadOrAdmin }, async (request, reply) => {
  const requests = await prisma.joinRequest.findMany({
    where: request.user?.role === 'ward_lead' ? { wardSlug: request.user.wardSlug } : {},
    include: { member: true },
    orderBy: { createdAt: 'desc' },
  });
  return requests;
});

// Form submission endpoint (public)
app.post('/api/forms/:id/submit', async (request, reply) => {
  const { id } = request.params as any;
  const submissionData = request.body as any;

  try {
    // Verify form exists and is active
    const form = await prisma.form.findUnique({
      where: { id, isActive: true }
    });

    if (!form) {
      return reply.code(404).send({ error: 'Form not found or inactive' });
    }

    // Validate required fields
    const fields = form.fields as any[];
    const requiredFields = fields.filter((field: any) => field.required);
    const missingFields = requiredFields.filter((field: any) => !submissionData[field.name]);

    if (missingFields.length > 0) {
      return reply.code(400).send({
        error: 'Missing required fields',
        fields: missingFields.map((field: any) => field.name)
      });
    }

    // Check GDPR consent
    if (!submissionData.gdprConsent) {
      return reply.code(400).send({ error: 'GDPR consent is required' });
    }

    // Create form submission
    const submission = await prisma.formSubmission.create({
      data: {
        formId: id,
        data: submissionData,
        memberId: submissionData.memberId // Optional link to existing member
      }
    });

    return { success: true, submissionId: submission.id };
  } catch (error) {
    console.error('Form submission error:', error);
    return reply.code(500).send({ error: 'Failed to submit form' });
  }
});

// Get form by ID (public)
app.get('/api/forms/:id', async (request, reply) => {
  const { id } = request.params as any;

  try {
    const form = await prisma.form.findUnique({
      where: { id, isActive: true }
    });

    if (!form) {
      return reply.code(404).send({ error: 'Form not found' });
    }

    return form;
  } catch (error) {
    console.error('Error fetching form:', error);
    return reply.code(500).send({ error: 'Failed to fetch form' });
  }
});

// Start server
const start = async () => {
  try {
    await app.listen({ port: 3000, host: '0.0.0.0' });
    console.log('API server listening on port 3000');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();