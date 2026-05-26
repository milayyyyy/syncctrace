import React from 'react';
import { GraduationCap, BookOpen } from 'lucide-react';
import type { Role } from '../../types';

const ROLES: { value: Role; icon: React.ReactNode; label: string; description: string }[] = [
  {
    value: 'STUDENT',
    icon: <GraduationCap size={20} />,
    label: 'Student',
    description: 'Submit artifacts & track traceability',
  },
  {
    value: 'FACULTY',
    icon: <BookOpen size={20} />,
    label: 'Adviser',
    description: 'Review audits & monitor groups',
  },
];

interface RoleSelectorProps {
  readonly selectedRole: Role;
  readonly onSelect: (role: Role) => void;
}

export const RoleSelector: React.FC<RoleSelectorProps> = ({ selectedRole, onSelect }) => (
  <div className="grid grid-cols-2 gap-3 mb-10">
    {ROLES.map((role) => {
      const active = selectedRole === role.value;
      return (
        <button
          key={role.value}
          type="button"
          onClick={() => onSelect(role.value)}
          className={`flex flex-col items-start p-4 rounded-xl border text-left transition-all duration-150 ${
            active
              ? 'border-[#D97706] bg-amber-50/80 ring-1 ring-amber-200 shadow-sm'
              : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-slate-50'
          }`}
        >
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2.5 ${
              active ? 'bg-amber-100 text-[#D97706]' : 'bg-slate-100 text-gray-400'
            }`}
          >
            {role.icon}
          </div>
          <p className={`text-sm font-bold ${active ? 'text-gray-900' : 'text-gray-700'}`}>{role.label}</p>
          <p className="text-xs text-gray-500 mt-0.5 leading-snug">{role.description}</p>
        </button>
      );
    })}
  </div>
);
