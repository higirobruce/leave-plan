export const getEvents = async () => {
  const res = await fetch('/api/plans');
  const data = await res.json();
  return data.plans || [];
};

export const getUsers = async () => {
  const res = await fetch('/api/users');
  const data = await res.json();
  return data.users || [];
};
