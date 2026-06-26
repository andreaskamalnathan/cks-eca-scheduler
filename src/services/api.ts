import axios from 'axios';

// Connects directly to your Express port 5001 engine
const API_URL = 'http://localhost:5001/api';

export const getActivities = async () => {
  const response = await axios.get(`${API_URL}/activities`);
  return response.data;
};

export const registerECA = async (studentId: number, activityId: number, day: string, adminOverride = false) => {
  const response = await axios.post(`${API_URL}/register`, {
    student_id: studentId,
    activity_id: activityId,
    day_of_week: day,
    override_rules: adminOverride
  });
  return response.data;
};