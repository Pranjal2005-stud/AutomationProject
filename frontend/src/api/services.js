import api from './client'

// Dashboard
export const getStats = () => api.get('/dashboard/stats')
export const getCharts = () => api.get('/dashboard/charts')
export const getRecent = () => api.get('/dashboard/recent')

// Emails
export const getEmails = (params) => api.get('/emails/', { params })
export const getEmail = (id) => api.get(`/emails/${id}`)
export const createEmail = (data) => api.post('/emails/', data)
export const updateEmail = (id, data) => api.patch(`/emails/${id}`, data)
export const createTicketForEmail = (id) => api.post(`/emails/${id}/create-ticket`)
export const retryEmail = (id) => api.post(`/emails/${id}/retry`)

// Tickets
export const getTickets = (params) => api.get('/tickets/', { params })
export const getTicket = (id) => api.get(`/tickets/${id}`)
export const createTicket = (data) => api.post('/tickets/', data)
export const getTicketJiraUrl = (id) => api.get(`/tickets/${id}/jira-url`)

// Meetings
export const getMeetings = (params) => api.get('/meetings/', { params })
export const getMeeting = (id) => api.get(`/meetings/${id}`)
export const scheduleMeeting = (data) => api.post('/meetings/', data)
export const getUpcomingMeetings = () => api.get('/meetings/upcoming')
export const cancelMeeting = (id) => api.delete(`/meetings/${id}/cancel`)
export const updateMeeting = (id, data) => api.put(`/meetings/${id}`, data)

// Teams
export const getTeams = () => api.get('/teams/')
export const getTeam = (id) => api.get(`/teams/${id}`)
export const createTeam = (data) => api.post('/teams/', data)
export const updateTeam = (id, data) => api.put(`/teams/${id}`, data)
export const deleteTeam = (id) => api.delete(`/teams/${id}`)
export const addTeamMember = (teamId, data) => api.post(`/teams/${teamId}/members`, data)
export const removeTeamMember = (teamId, memberId) => api.delete(`/teams/${teamId}/members/${memberId}`)

// Gmail
export const pollGmail = () => api.post('/gmail/poll')

// Logs
export const getLogs = (limit = 100) => api.get('/logs/', { params: { limit } })

// Settings
export const getSettings = () => api.get('/settings/')
export const updateSetting = (key, value) => api.put(`/settings/${key}`, { value })
