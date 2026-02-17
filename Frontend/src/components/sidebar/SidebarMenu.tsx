'use client';

import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Settings, LogOut, MoreVertical, User } from 'lucide-react';
import { useUserStore } from '@/store/userStore';
import { apiClient } from '@/services/api';
import toast from 'react-hot-toast';

export function SidebarMenu() {
  const user = useUserStore((state) => state.user);
  const logout = useUserStore((state) => state.logout);

  const handleLogout = async () => {
    try {
      await apiClient.logout();
      logout();
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error('Failed to logout');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="w-full justify-center">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem disabled className="text-xs py-2">
          <User className="h-4 w-4 mr-2" />
          <div className="flex flex-col">
            <span className="font-medium">{user?.name || 'User'}</span>
            <span className="text-muted-foreground text-xs">{user?.email}</span>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <button className="w-full text-left cursor-pointer py-2">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </button>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <button
            onClick={handleLogout}
            className="w-full text-left cursor-pointer py-2 text-destructive focus:text-destructive"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </button>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
