import React, { useEffect, useState } from "react";
import { db } from "../firebase/firebase"; // Import your db instance
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { FaPencilAlt, FaSave } from "react-icons/fa"; // Pencil icon for editing
import styled from "styled-components"; // Import styled-components

const Specials = () => {
  const [events, setEvents] = useState([]);
  const [associates, setAssociates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStaff, setSelectedStaff] = useState({});

  // Function to fetch special events and associated staff
  const fetchSpecialEvents = async () => {
    try {
      const eventsRef = collection(db, "special-events");
      const eventsQuery = query(eventsRef, orderBy("startTime"));
      const querySnapshot = await getDocs(eventsQuery);
      const eventsData = [];
      const allAssociates = {}; // Store all associates here
      const staffData = {}; // Will store staff for current event

      // First, fetch all associates
      const associatesRef = collection(db, "associates");
      const associatesSnapshot = await getDocs(associatesRef);
      associatesSnapshot.forEach((docSnapshot) => {
        const associateData = docSnapshot.data();
        associateData.id = docSnapshot.id; // Use Firestore document ID as associate's ID
        allAssociates[docSnapshot.id] = associateData;
      });

      // Now, fetch events and their assigned staff
      for (const docSnapshot of querySnapshot.docs) {
        const event = docSnapshot.data();
        const eventStaffIds = event.staff || [];
        const eventData = { ...event, id: docSnapshot.id, isEditMode: false }; // Add edit mode flag

        // Prepare staff data for each event (this is only the staff associated with the event)
        const staffPromises = eventStaffIds.map(async (staffId) => {
          const staffRef = doc(db, "associates", staffId);
          const staffSnapshot = await getDoc(staffRef);
          if (staffSnapshot.exists()) {
            const staffDataFromDoc = staffSnapshot.data();
            staffDataFromDoc.id = staffSnapshot.id; // Assign the document ID as the id
            staffData[staffSnapshot.id] = staffDataFromDoc; // Store the staff with their ID
          }
        });

        await Promise.all(staffPromises);

        eventData.staffInfo = eventStaffIds.map(
          (staffId) => staffData[staffId]
        );
        eventsData.push(eventData);
      }

      // Set both associates and events state
      setAssociates(Object.values(allAssociates)); // Use all associates here
      setEvents(eventsData);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching specials: ", error);
      setLoading(false);
    }
  };

  // Function to handle toggling edit mode for an entire event
  const handleToggleEdit = (eventId) => {
    setEvents((prevEvents) =>
      prevEvents.map((event) => {
        if (event.id === eventId) {
          // If switching from edit mode to view mode, sync staff data
          if (event.isEditMode) {
            const selectedStaffForEvent = selectedStaff[eventId] || [];
            const updatedEvent = {
              ...event,
              staffInfo: associates.filter((staff) =>
                selectedStaffForEvent.includes(staff.id)
              ),
            };
            return { ...updatedEvent, isEditMode: false };
          } else {
            return { ...event, isEditMode: true }; // Switch to edit mode
          }
        }
        return event;
      })
    );
  };

  // Function to handle updating a specific field of an event
  const handleEdit = (eventId, field, value) => {
    setEvents((prevEvents) =>
      prevEvents.map((event) =>
        event.id === eventId ? { ...event, [field]: value } : event
      )
    );
  };

  // Function to save edited fields to Firestore
  const handleSave = async (eventId) => {
    const event = events.find((event) => event.id === eventId);
    if (!event) return; // Make sure the event exists

    const eventRef = doc(db, "special-events", eventId);
    try {
      await updateDoc(eventRef, {
        contactPerson: event.contactPerson,
        contactPhone: event.contactPhone,
        orderDetails: event.orderDetails,
        payment: event.payment,
        staff: selectedStaff[eventId] || [], // Save the selected staff
      });
    } catch (error) {
      console.error("Error updating event: ", error);
    }
  };

  const handleStaffChange = (staffId, eventId) => {
    console.log(staffId, eventId);
    setSelectedStaff((prevSelectedStaff) => {
      const eventStaff = prevSelectedStaff[eventId] || [];

      // Toggle the staff ID for this event
      const updatedEventStaff = eventStaff.includes(staffId)
        ? eventStaff.filter((id) => id !== staffId) // Remove if already selected
        : [...eventStaff, staffId]; // Add if not selected

      return {
        ...prevSelectedStaff,
        [eventId]: updatedEventStaff, // Update only the specific event's staff selection
      };
    });
  };

  const handleSaveClick = (eventId) => {
    handleSave(eventId); // Save the event
    handleToggleEdit(eventId); // Toggle the edit mode off after saving
  };

  useEffect(() => {
    fetchSpecialEvents();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Container>
      {events.length === 0 ? (
        <p>No special events found.</p>
      ) : (
        <div>
          {events.map((event) => (
            <EventWrapper key={event.id}>
              <Header>
                {/* Conditionally render pencil or save icon */}
                <div
                  onClick={() => {
                    if (event.isEditMode) {
                      handleSaveClick(event.id); // Save if in edit mode
                    } else {
                      handleToggleEdit(event.id); // Toggle edit mode if not
                    }
                  }}
                  style={{ cursor: "pointer", marginRight: "10px" }}
                >
                  {event.isEditMode ? <FaSave /> : <FaPencilAlt />}
                </div>
                <h2>
                  {event.eventType} - {event.event}
                </h2>
              </Header>
              <Table>
                <tbody>
                  <TableRow>
                    <TableHeader>Contact Person:</TableHeader>
                    <TableData>
                      {event.isEditMode ? (
                        <Input
                          type="text"
                          value={event.contactPerson}
                          onChange={(e) =>
                            handleEdit(
                              event.id,
                              "contactPerson",
                              e.target.value
                            )
                          }
                        />
                      ) : (
                        <span>{event.contactPerson}</span>
                      )}
                    </TableData>
                  </TableRow>
                  <TableRow>
                    <TableHeader>Email:</TableHeader>
                    <TableData>
                      {event.isEditMode ? (
                        <Input
                          type="text"
                          value={event.contactEmail}
                          onChange={(e) =>
                            handleEdit(event.id, "contactEmail", e.target.value)
                          }
                        />
                      ) : (
                        <span>{event.contactEmail}</span>
                      )}
                    </TableData>
                  </TableRow>
                  <TableRow>
                    <TableHeader>Phone:</TableHeader>
                    <TableData>
                      {event.isEditMode ? (
                        <Input
                          type="text"
                          value={event.contactPhone}
                          onChange={(e) =>
                            handleEdit(event.id, "contactPhone", e.target.value)
                          }
                        />
                      ) : (
                        <span>{event.contactPhone}</span>
                      )}
                    </TableData>
                  </TableRow>
                  <TableRow>
                    <TableHeader>Start Time:</TableHeader>
                    <TableData>
                      {event.isEditMode ? (
                        <Input
                          type="datetime-local"
                          value={new Date(event.startTime.seconds * 1000)
                            .toISOString()
                            .slice(0, 16)}
                          onChange={(e) =>
                            handleEdit(
                              event.id,
                              "startTime",
                              new Date(e.target.value)
                            )
                          }
                        />
                      ) : (
                        new Date(
                          event.startTime.seconds * 1000
                        ).toLocaleString()
                      )}
                    </TableData>
                  </TableRow>
                  <TableRow>
                    <TableHeader>End Time:</TableHeader>
                    <TableData>
                      {event.isEditMode ? (
                        <Input
                          type="datetime-local"
                          value={new Date(event.endTime.seconds * 1000)
                            .toISOString()
                            .slice(0, 16)}
                          onChange={(e) =>
                            handleEdit(
                              event.id,
                              "endTime",
                              new Date(e.target.value)
                            )
                          }
                        />
                      ) : (
                        new Date(event.endTime.seconds * 1000).toLocaleString()
                      )}
                    </TableData>
                  </TableRow>
                  <TableRow>
                    <TableHeader>Order Complete:</TableHeader>
                    <TableData>
                      {event.isEditMode ? (
                        <Input
                          type="checkbox"
                          checked={event.orderComplete}
                          onChange={(e) =>
                            handleEdit(
                              event.id,
                              "orderComplete",
                              e.target.checked
                            )
                          }
                        />
                      ) : event.orderComplete ? (
                        "Yes"
                      ) : (
                        "No"
                      )}
                    </TableData>
                  </TableRow>
                  <TableRow>
                    <TableHeader>Payment Info:</TableHeader>
                    <TableData>
                      {event.isEditMode ? (
                        <Input
                          type="text"
                          value={event.payment}
                          onChange={(e) =>
                            handleEdit(event.id, "payment", e.target.value)
                          }
                        />
                      ) : (
                        <span>{event.payment}</span>
                      )}
                    </TableData>
                  </TableRow>
                  <TableRow>
                    <TableHeader>Details:</TableHeader>
                    <TableData>
                      {event.isEditMode ? (
                        <Textarea
                          value={event.orderDetails}
                          onChange={(e) =>
                            handleEdit(event.id, "orderDetails", e.target.value)
                          }
                        />
                      ) : (
                        <span>{event.orderDetails}</span>
                      )}
                    </TableData>
                  </TableRow>
                  <TableRow>
                    <TableHeader>Staff:</TableHeader>
                    <TableData>
                      {event.isEditMode ? (
                        <div>
                          {associates
                            .sort((a, b) =>
                              a.lastName.localeCompare(b.lastName)
                            ) // Sort by last name alphabetically
                            .map((staff) => (
                              <div
                                key={staff.id}
                                style={{ marginBottom: "10px" }}
                              >
                                <input
                                  type="checkbox"
                                  id={staff.id}
                                  checked={
                                    selectedStaff[event.id]?.includes(
                                      staff.id
                                    ) || false
                                  } // Pre-select based on selectedStaff
                                  onChange={() =>
                                    handleStaffChange(staff.id, event.id)
                                  } // Handle staff selection
                                />
                                <label htmlFor={staff.id}>
                                  {staff.lastName}, {staff.firstName}
                                </label>
                              </div>
                            ))}
                        </div>
                      ) : event.staffInfo && event.staffInfo.length > 0 ? (
                        event.staffInfo
                          .sort((a, b) => a.lastName.localeCompare(b.lastName)) // Sort by last name alphabetically
                          .map((staff, index) => (
                            <div key={index}>
                              {staff
                                ? `${staff.lastName}, ${staff.firstName}`
                                : "Unknown staff member"}
                            </div>
                          ))
                      ) : (
                        <div>No staff assigned.</div>
                      )}
                    </TableData>
                  </TableRow>
                </tbody>
              </Table>
              {event.isEditMode && (
                <SaveButton onClick={() => handleSave(event.id)}>
                  Save
                </SaveButton>
              )}
            </EventWrapper>
          ))}
        </div>
      )}
    </Container>
  );
};

// Styled Components
const Container = styled.div`
  padding: 20px;
`;

const EventWrapper = styled.div`
  border-bottom: 1px solid #ccc;
  margin-bottom: 20px;
  padding-bottom: 20px;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 10px;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const TableRow = styled.tr``;

const TableHeader = styled.td`
  font-weight: bold;
  padding: 8px 12px;
  border-bottom: 1px solid #ccc;
  width: 200px;
`;

const TableData = styled.td`
  padding: 8px 12px;
  border-bottom: 1px solid #ccc;
`;

const Input = styled.input`
  padding: 5px;
  width: 100%;
  border-radius: 4px;
  border: 1px solid #ccc;
  margin-top: 5px;
`;

const Textarea = styled.textarea`
  padding: 5px;
  width: 100%;
  height: 150px;
  border-radius: 4px;
  border: 1px solid #ccc;
  margin-top: 5px;
  resize: vertical;
`;

const SaveButton = styled.button`
  margin-top: 10px;
  padding: 5px 10px;
  cursor: pointer;
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 4px;
  &:hover {
    background-color: #45a049;
  }
`;

export default Specials;
