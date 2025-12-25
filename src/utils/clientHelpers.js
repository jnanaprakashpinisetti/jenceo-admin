// utils/clientHelpers.js

export const transformClientData = (firebaseData, department) => {
  if (!firebaseData) return [];
  
  return Object.entries(firebaseData).map(([key, value]) => ({
    id: key,
    clientId: value.clientId || value.idNo || key,
    name: `${value.firstName || ""} ${value.lastName || ""}`.trim() || 
          value.clientName || 
          value.name || 
          "Unknown Client",
    location: value.address || 
              value.location || 
              `${value.city || ""} ${value.state || ""}`.trim() || 
              "Unknown Location",
    phone: value.phone || value.mobile || value.contactNumber || "N/A",
    email: value.email || "N/A",
    department: department,
    address: value.address,
    city: value.city,
    state: value.state,
    // Include any other relevant fields
    ...value
  }));
};

export const filterClients = (clients, searchQuery) => {
  if (!searchQuery.trim()) return clients;
  
  return clients.filter(client => {
    const query = searchQuery.toLowerCase();
    return (
      client.name?.toLowerCase().includes(query) ||
      client.clientId?.toLowerCase().includes(query) ||
      client.phone?.includes(query) ||
      client.email?.toLowerCase().includes(query) ||
      client.location?.toLowerCase().includes(query)
    );
  });
};

export const formatClientForDisplay = (client) => {
  return {
    id: client.id,
    clientId: client.clientId,
    name: client.name,
    phone: client.phone,
    email: client.email,
    location: client.location,
    department: client.department
  };
};