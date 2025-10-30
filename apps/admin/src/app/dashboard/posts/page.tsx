'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FileUpload } from '@/components/ui/file-upload';
import { TelegramPreview } from '@/components/telegram-preview';
import { format } from 'date-fns';

interface Post {
  id: string;
  type: string;
  title?: string;
  content?: string;
  status: 'DRAFT' | 'READY' | 'SCHEDULED' | 'SENT';
  scheduledAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  postedAt?: string;
  createdAt: string;
  updatedAt: string;
  media: Media[];
}

interface Media {
  id: string;
  url: string;
  type: string;
  filename?: string;
  size?: number;
}

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    type: 'text',
    title: '',
    content: '',
    utmUrl: '',
  });

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const response = await fetch('/api/posts');
      if (response.ok) {
        const data = await response.json();
        setPosts(data);
      }
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setIsCreateDialogOpen(false);
        setFormData({ type: 'text', title: '', content: '', utmUrl: '' });
        fetchPosts();
      }
    } catch (error) {
      console.error('Failed to create post:', error);
    }
  };

  const handleApprove = async (postId: string) => {
    try {
      const response = await fetch(`/api/posts/${postId}/approve`, {
        method: 'POST',
      });

      if (response.ok) {
        fetchPosts();
      }
    } catch (error) {
      console.error('Failed to approve post:', error);
    }
  };

  const handleSchedule = async (postId: string, scheduledAt: string) => {
    try {
      const response = await fetch(`/api/posts/${postId}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledAt }),
      });

      if (response.ok) {
        fetchPosts();
      }
    } catch (error) {
      console.error('Failed to schedule post:', error);
    }
  };

  const handleSend = async (postId: string) => {
    try {
      const response = await fetch(`/api/posts/${postId}/send`, {
        method: 'POST',
      });

      if (response.ok) {
        fetchPosts();
      }
    } catch (error) {
      console.error('Failed to send post:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      DRAFT: 'secondary',
      READY: 'outline',
      SCHEDULED: 'default',
      SENT: 'default',
    } as const;

    return <Badge variant={variants[status as keyof typeof variants]}>{status}</Badge>;
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Posts</h1>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>Create Post</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Post</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="type">Type</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="photo">Photo</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="document">Document</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Optional title"
                />
              </div>
              <div>
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Post content..."
                  rows={6}
                />
              </div>
              <div>
                <Label htmlFor="utmUrl">UTM URL</Label>
                <Input
                  id="utmUrl"
                  value={formData.utmUrl}
                  onChange={(e) => setFormData({ ...formData, utmUrl: e.target.value })}
                  placeholder="Optional UTM tracking URL"
                />
              </div>
              <Button onClick={handleCreate} className="w-full">
                Create Post
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {posts.map((post) => (
          <Card key={post.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{post.title || 'Untitled Post'}</CardTitle>
                  <div className="flex items-center gap-2 mt-2">
                    {getStatusBadge(post.status)}
                    <span className="text-sm text-muted-foreground">
                      Created {format(new Date(post.createdAt), 'PPp')}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {post.status === 'DRAFT' && (
                    <Button size="sm" onClick={() => handleApprove(post.id)}>
                      Approve
                    </Button>
                  )}
                  {post.status === 'READY' && (
                    <Button
                      size="sm"
                      onClick={() => {
                        const scheduledAt = prompt('Enter scheduled date/time (ISO format):');
                        if (scheduledAt) handleSchedule(post.id, scheduledAt);
                      }}
                    >
                      Schedule
                    </Button>
                  )}
                  {post.status === 'SCHEDULED' && (
                    <Button size="sm" onClick={() => handleSend(post.id)}>
                      Mark as Sent
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Content Preview</h4>
                  <TelegramPreview post={post} />
                </div>
                <div>
                  <h4 className="font-medium mb-2">Details</h4>
                  <div className="space-y-2 text-sm">
                    <p><strong>Type:</strong> {post.type}</p>
                    {post.scheduledAt && (
                      <p><strong>Scheduled:</strong> {format(new Date(post.scheduledAt), 'PPp')}</p>
                    )}
                    {post.approvedAt && (
                      <p><strong>Approved:</strong> {format(new Date(post.approvedAt), 'PPp')}</p>
                    )}
                    {post.postedAt && (
                      <p><strong>Posted:</strong> {format(new Date(post.postedAt), 'PPp')}</p>
                    )}
                    {post.media.length > 0 && (
                      <div>
                        <strong>Media ({post.media.length}):</strong>
                        <div className="mt-1 space-y-1">
                          {post.media.map((media) => (
                            <div key={media.id} className="text-xs text-muted-foreground">
                              {media.filename} ({media.type})
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}