import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'purple';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'neutral', size = 'sm' }) => {
  const variantStyles = {
    primary: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    info: 'bg-sky-50 text-sky-700 border-sky-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  const sizeStyles = {
    sm: 'text-xs px-2.5 py-0.5 font-medium',
    md: 'text-sm px-3 py-1 font-semibold',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border ${variantStyles[variant]} ${sizeStyles[size]} transition-colors`}
    >
      {children}
    </span>
  );
};

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const norm = (status || '').toUpperCase();

  switch (norm) {
    case 'NEW':
      return <Badge variant="info">New</Badge>;
    case 'IN_PROGRESS':
      return <Badge variant="warning">In Progress</Badge>;
    case 'FOLLOW_UP':
      return <Badge variant="purple">Follow Up</Badge>;
    case 'CONVERTED':
      return <Badge variant="success">Converted</Badge>;
    case 'LOST':
      return <Badge variant="danger">Lost</Badge>;
    case 'CLOSED':
      return <Badge variant="neutral">Closed</Badge>;

    // Follow-up
    case 'PENDING':
      return <Badge variant="warning">Pending</Badge>;
    case 'COMPLETED':
      return <Badge variant="success">Completed</Badge>;
    case 'MISSED':
      return <Badge variant="danger">Missed</Badge>;
    case 'CANCELLED':
      return <Badge variant="neutral">Cancelled</Badge>;

    // Email lead
    case 'REVIEWED':
      return <Badge variant="primary">Reviewed</Badge>;
    case 'QUALIFIED':
      return <Badge variant="success">Qualified</Badge>;
    case 'REJECTED':
      return <Badge variant="danger">Rejected</Badge>;

    // Campaign
    case 'DRAFT':
      return <Badge variant="neutral">Draft</Badge>;
    case 'SCHEDULED':
      return <Badge variant="warning">Scheduled</Badge>;
    case 'SENT':
      return <Badge variant="success">Sent</Badge>;
    case 'PLANNED':
      return <Badge variant="info">Planned</Badge>;
    case 'ACTIVE':
      return <Badge variant="success">Active</Badge>;

    default:
      return <Badge variant="neutral">{status}</Badge>;
  }
};

export const PriorityBadge: React.FC<{ priority: string }> = ({ priority }) => {
  const norm = (priority || '').toUpperCase();
  switch (norm) {
    case 'URGENT':
      return <Badge variant="danger">Urgent</Badge>;
    case 'HIGH':
      return <Badge variant="warning">High</Badge>;
    case 'MEDIUM':
      return <Badge variant="primary">Medium</Badge>;
    case 'LOW':
      return <Badge variant="neutral">Low</Badge>;
    default:
      return <Badge variant="neutral">{priority}</Badge>;
  }
};

export const RoleBadge: React.FC<{ role: string }> = ({ role }) => {
  const norm = (role || '').toUpperCase();
  switch (norm) {
    case 'ADMIN':
      return <Badge variant="purple">Admin</Badge>;
    case 'SALES_USER':
      return <Badge variant="primary">Sales User</Badge>;
    case 'MANAGER':
      return <Badge variant="info">Manager</Badge>;
    default:
      return <Badge variant="neutral">{role}</Badge>;
  }
};

export default Badge;
