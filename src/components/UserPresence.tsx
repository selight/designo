import React from 'react';

interface SocketUser {
  userId: string;
  userName: string;
  userColor: string;
  socketId: string;
}

interface Props {
  users: SocketUser[];
  isVisible: boolean;
}

const UserPresence: React.FC<Props> = ({ users, isVisible }) => {
  if (!isVisible) {
    return (
      <div className="text-xs text-slate-400">
        Connecting...
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-xs text-slate-400">
        No other users online
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        <span className="text-xs text-slate-300 font-medium">
          {users.length} {users.length === 1 ? 'user' : 'users'} online
        </span>
      </div>
      
      <div className="space-y-1">
        {users.map((user) => (
          <div
            key={user.userId}
            className="flex items-center gap-2 px-2 py-1 bg-slate-800/50 rounded-lg"
          >
            <div
              className="w-4 h-4 rounded-full border border-slate-600 flex items-center justify-center text-xs font-medium text-white"
              style={{ backgroundColor: user.userColor }}
            >
              {user.userName.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs text-slate-300 truncate">
              {user.userName}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserPresence;
