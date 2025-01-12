export function isTeacher(userId?: string | null) {
  if (!userId || !process.env.NEXT_PUBLIC_TEACHER_ID) return false;
  
  // Split the teacher IDs string into an array and check if userId is included
  const teacherIds = process.env.NEXT_PUBLIC_TEACHER_ID.split(',').map(id => id.trim());
  return teacherIds.includes(userId);
}
