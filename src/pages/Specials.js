import React, { useEffect, useState, useCallback } from "react";
import { db } from "../firebase/firebase"; // Import your db instance
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  query,
  orderBy,
  addDoc,
  where,
} from "firebase/firestore";
import { FaPencilAlt, FaSave } from "react-icons/fa"; // Pencil icon for editing
import styled from "styled-components"; // Import styled-components

const Specials = () => {
  const [events, setEvents] = useState([]);
  const [associates, setAssociates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStaff, setSelectedStaff] = useState({});
  const [showCompletedOrders, setShowCompletedOrders] = useState(false);

  // Function to fetch special events and associated staff
  const fetchSpecialEvents = useCallback(async () => {
    try {
      const eventsRef = collection(db, "special-events");

      // Modify query to filter by orderComplete based on checkbox
      const eventsQuery = query(
        eventsRef,
        orderBy("startTime"),
        where("orderComplete", "==", showCompletedOrders) // Filter by orderComplete
      );

      const querySnapshot = await getDocs(eventsQuery);
      const eventsData = [];
      const allAssociates = {}; // Store all associates here
      const staffData = {}; // Will store staff for current event

      // Fetch all associates
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
  });

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
        contactEmail: event.contactEmail,
        orderDetails: event.orderDetails,
        startTime: event.startTime,
        orderComplete: event.orderComplete,
        endTime: event.endTime,
        payment: event.payment,
        event: event.event,
        eventType: event.eventType,

        staff: selectedStaff[eventId] || [], // Save the selected staff
      });
    } catch (error) {
      console.error("Error updating event: ", error);
    }
  };

  const handleStaffChange = (staffId, eventId) => {
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

  const isAnyEventInEditMode = events.some((event) => event.isEditMode);

  const handleNewEvent = async () => {
    try {
      // Create a new event document with initial empty values
      const newEventRef = await addDoc(collection(db, "special-events"), {
        eventType: "", // Default to empty string
        event: "",
        startTime: new Date(),
        endTime: new Date(),
        location: "",
        contactPerson: "",
        contactPhone: "",
        orderDetails: "",
        orderComplete: false,
        payment: "",
        staff: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Set this new event as being edited
      setEvents(
        (prev) =>
          [
            ...prev,
            {
              id: newEventRef.id,
              eventType: String,
              event: String,
              startTime: new Date(),
              endTime: new Date(),
              location: String,
              contactPerson: String,
              orderComplete: Boolean,
              contactPhone: String,
              orderDetails: String,
              payment: String,
              staff: [],
              isEditMode: true, // Start in edit mode
            },
          ].sort((a, b) => a.startTime - b.startTime) // Sorting by startTime (optional)
      );
    } catch (error) {
      console.error("Error creating new event:", error);
    }
  };

  useEffect(() => {
    fetchSpecialEvents();
  }, [showCompletedOrders]); // This will run when the component mounts and whenever showCompletedOrders changes

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Container>
      <NewEventButton
        onClick={handleNewEvent}
        disabled={isAnyEventInEditMode} // Disable button when isEditMode is true
      >
        New Event
      </NewEventButton>
      <div style={{ marginBottom: "20px" }}>
        <label>
          <input
            type="checkbox"
            checked={showCompletedOrders}
            onChange={() => setShowCompletedOrders((prev) => !prev)}
          />
          Show Completed Orders
        </label>
      </div>

      {events.length === 0 ? (
        <p>No special events found.</p>
      ) : (
        <div>
          {events.map((event) => (
            <EventWrapper key={event.id}>
              <Header>
                {event.isEditMode ? (
                  <FaSave
                    onClick={() => {
                      handleSave(event.id); // Save the data when clicking the save icon
                      handleToggleEdit(event.id); // Exit edit mode
                    }}
                    style={{ cursor: "pointer", marginRight: "10px" }}
                  />
                ) : (
                  <FaPencilAlt
                    onClick={() => handleToggleEdit(event.id)} // Enter edit mode
                    style={{ cursor: "pointer", marginRight: "10px" }}
                  />
                )}
                <h2>
                  {event.isEditMode ? (
                    <>
                      <input
                        type="text"
                        value={event.eventType || ""} // Fallback to empty string if eventType is null
                        onChange={(e) =>
                          handleEdit(event.id, "eventType", e.target.value)
                        }
                        placeholder={event.eventType ? "" : "Enter Event Type"} // Use placeholder if null
                      />
                      {" - "}
                      <input
                        type="text"
                        value={event.event || ""} // Fallback to empty string if event is null
                        onChange={(e) =>
                          handleEdit(event.id, "event", e.target.value)
                        }
                        placeholder={event.event ? "" : "Enter Event Name"} // Use placeholder if null
                      />
                    </>
                  ) : (
                    `${event.eventType} - ${event.event}`
                  )}
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
                      {
                        event.isEditMode ? (
                          <Input
                            type="datetime-local"
                            value={
                              event.startTime &&
                              !isNaN(
                                (event.startTime.toDate
                                  ? event.startTime.toDate()
                                  : event.startTime
                                ).getTime()
                              ) // Ensure it's a valid date
                                ? new Date(
                                    (event.startTime.toDate
                                      ? event.startTime.toDate()
                                      : event.startTime
                                    ).getTime() -
                                      new Date(
                                        event.startTime.toDate
                                          ? event.startTime.toDate()
                                          : event.startTime
                                      ).getTimezoneOffset() *
                                        60000
                                  )
                                    .toISOString()
                                    .slice(0, 16) // Format to 'YYYY-MM-DDTHH:mm'
                                : "" // Default to an empty string if no valid startTime
                            }
                            onChange={(e) =>
                              handleEdit(
                                event.id,
                                "startTime",
                                e.target.value
                                  ? new Date(e.target.value) // Convert input back to Date object
                                  : null // Handle empty value correctly
                              )
                            }
                          />
                        ) : event.startTime ? (
                          new Date(
                            event.startTime.toDate
                              ? event.startTime.toDate()
                              : event.startTime
                          ).toLocaleString() // Display formatted date
                        ) : (
                          "No Start Time"
                        ) // Handle case where startTime is null or undefined
                      }
                    </TableData>
                  </TableRow>

                  <TableRow>
                    <TableHeader>Start Time:</TableHeader>
                    <TableData>
                      {
                        event.isEditMode ? (
                          <Input
                            type="datetime-local"
                            value={
                              event.endTime &&
                              !isNaN(
                                (event.endTime.toDate
                                  ? event.endTime.toDate()
                                  : event.endTime
                                ).getTime()
                              ) // Ensure it's a valid date
                                ? new Date(
                                    (event.endTime.toDate
                                      ? event.endTime.toDate()
                                      : event.endTime
                                    ).getTime() -
                                      new Date(
                                        event.endTime.toDate
                                          ? event.endTime.toDate()
                                          : event.endTime
                                      ).getTimezoneOffset() *
                                        60000
                                  )
                                    .toISOString()
                                    .slice(0, 16) // Format to 'YYYY-MM-DDTHH:mm'
                                : "" // Default to an empty string if no valid endTime
                            }
                            onChange={(e) =>
                              handleEdit(
                                event.id,
                                "endTime",
                                e.target.value
                                  ? new Date(e.target.value) // Convert input back to Date object
                                  : null // Handle empty value correctly
                              )
                            }
                          />
                        ) : event.endTime ? (
                          new Date(
                            event.endTime.toDate
                              ? event.endTime.toDate()
                              : event.endTime
                          ).toLocaleString() // Display formatted date
                        ) : (
                          "No End Time"
                        ) // Handle case where endTime is null or undefined
                      }
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
                            .filter((staff) => !staff.deleted && staff.lastName) // Only include associates that are not deleted
                            .sort((a, b) =>
                              (a.lastName || "").localeCompare(b.lastName || "")
                            ) // Sort by last name alphabetically
                            .map((staff) => (
                              <div
                                key={staff.id}
                                style={{ marginBottom: "10px" }}
                              >
                                <input
                                  type="checkbox"
                                  id={staff.id}
                                  checked={Boolean(
                                    (selectedStaff[event.id] || []).includes(
                                      staff.id
                                    )
                                  )}
                                  onChange={() =>
                                    handleStaffChange(staff.id, event.id)
                                  }
                                />
                                <label htmlFor={staff.id}>
                                  {staff.lastName}, {staff.firstName}
                                  {staff.role && staff.role.name && (
                                    <RoleCapsule color={staff.role.color}>
                                      {staff.role.name}
                                    </RoleCapsule>
                                  )}
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
                              {staff.role && staff.role.name && (
                                <RoleCapsule color={staff.role.color}>
                                  {staff.role.name}
                                </RoleCapsule>
                              )}
                            </div>
                          ))
                      ) : (
                        <div>No staff assigned.</div>
                      )}
                    </TableData>
                  </TableRow>
                </tbody>
              </Table>
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

const NewEventButton = styled.button`
  background-color: ${(props) =>
    props.disabled ? "gray" : "rgb(17, 17, 219)"};
  color: ${(props) => (props.disabled ? "#ccc" : "white")};
  border: none;
  padding: 10px 20px;
  margin-bottom: 20px;
  font-size: 16px;
  cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};
  border-radius: 5px;

  &:hover {
    background-color: ${(props) =>
      props.disabled ? "gray" : "rgb(17, 17, 219)"};
  }
`;

const RoleCapsule = styled.span`
  display: inline-block;
  margin-left: 10px;
  padding: 2px 8px;
  border-radius: 12px;
  background-color: ${(props) => props.color || "#ccc"};
  color: white;
  font-size: 12px;
  font-weight: bold;
  text-transform: uppercase;
`;

export default Specials;
