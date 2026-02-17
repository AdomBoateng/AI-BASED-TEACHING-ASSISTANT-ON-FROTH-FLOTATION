'use client';

import { Message } from '@/types';
import { Avatar } from '@/components/ui/avatar';
import { useUserStore } from '@/store/userStore';
import { format } from 'date-fns';

interface UserMessageProps {
  message: Message;
}

export function UserMessage({ message }: UserMessageProps) {
  const user = useUserStore((state) => state.user);

  return (
    <div className="flex gap-3 justify-end">
      <div className="flex max-w-xs flex-col gap-2 lg:max-w-md xl:max-w-lg">
        <div className="rounded-lg bg-primary p-3 text-primary-foreground break-words">
          <p className="text-sm">{message.content}</p>
        </div>
        <span className="text-xs text-muted-foreground text-right">
          {format(new Date(message.timestamp), 'HH:mm')}
        </span>
      </div>
      <Avatar className="h-8 w-8 flex-shrink-0">
        <div className="bg-primary text-primary-foreground flex items-center justify-center w-full h-full text-xs font-bold">
          {user?.name?.charAt(0)?.toUpperCase() || 'U'}
        </div>
      </Avatar>
    </div>
  );
}
