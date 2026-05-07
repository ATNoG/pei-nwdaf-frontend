export const ROLE_ACCESS = {
  '/':            ['admin', 'analyst', 'ml_engineer', 'policy_manager'],

  // Test roles, to confirm with the group what the end roles and accesses will be
  '/ml':          ['admin', 'ml_engineer'],
  '/analytics':   ['admin', 'analyst'],
  '/performance': ['admin', 'analyst', 'ml_engineer'],
  '/policy':      ['admin', 'policy_manager'],
  '/settings':    ['admin', 'analyst', 'ml_engineer', 'policy_manager'],
};
