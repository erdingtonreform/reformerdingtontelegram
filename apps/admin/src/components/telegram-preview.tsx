'use client';

interface Post {
  id: string;
  type: string;
  title?: string;
  content?: string;
  status: 'DRAFT' | 'READY' | 'SCHEDULED' | 'SENT';
  media?: any[];
}

interface TelegramPreviewProps {
  post: Post;
}

export function TelegramPreview({ post }: TelegramPreviewProps) {
  const formatContent = (content: string) => {
    // Basic Telegram formatting simulation
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/__(.*?)__/g, '<u>$1</u>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br />');
  };

  return (
    <div className="bg-white border rounded-lg p-4 max-w-md">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
          R
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">Reform UK Erdington</span>
            <span className="text-xs text-gray-500">now</span>
          </div>
          <div className="mt-1">
            {post.title && (
              <div className="font-medium text-gray-900 mb-2">{post.title}</div>
            )}
            {post.content && (
              <div
                className="text-gray-800 text-sm whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: formatContent(post.content) }}
              />
            )}
            {post.media && post.media.length > 0 && (
              <div className="mt-3 space-y-2">
                {post.media.map((media, index) => (
                  <div key={index} className="bg-gray-100 rounded p-2 text-xs text-gray-600">
                    📎 {media.filename || `${media.type} file`}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}