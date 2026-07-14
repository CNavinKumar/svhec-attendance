import React from 'react';

const StatusBadge = ({ status }) => {
  const getBadgeClass = (s) => {
    switch (s?.toLowerCase()) {
      case 'present':
        return 'badge-present';
      case 'absent':
        return 'badge-absent';
      case 'od':
        return 'badge-od';
      case 'pending':
        return 'badge-pending';
      case 'active':
        return 'badge-active';
      case 'locked':
        return 'badge-locked';
      case 'done':
        return 'badge-done';
      case 'admin':
        return 'badge-admin';
      default:
        return 'badge-pending';
    }
  };

  return (
    <span className={`badge ${getBadgeClass(status)}`}>
      {status || 'Unknown'}
    </span>
  );
};

export default StatusBadge;
