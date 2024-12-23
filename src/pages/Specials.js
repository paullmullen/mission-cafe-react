import React, { useEffect, useState } from "react";
import { db } from "../firebase/firebase"; // Import your db instance
import { collection, getDocs, doc, getDoc } from "firebase/firestore";

const Specials = () => {
  const [events, setEvents] = useState([]);
  const [staffMembers, setStaffMembers] = useState({}); // To store staff data by ID
  const [loading, setLoading] = useState(true);

  // Function to fetch special events and associated staff
  const fetchSpecialEvents = async () => {
    try {
      const eventsRef = collection(db, "special-events"); // Fetch collection
      const querySnapshot = await getDocs(eventsRef);
      const eventsData = [];

      // Fetch staff data from the associates collection
      const staffData = {};

      for (const docSnapshot of querySnapshot.docs) {
        const event = docSnapshot.data();
        const eventStaffIds = event.staff;

        // Prepare the event data
        const eventData = { ...event, id: docSnapshot.id };

        // Fetch staff details for each staff member in the event
        const staffPromises = eventStaffIds.map(async (staffId) => {
          const staffRef = doc(db, "associates", staffId);
          const staffSnapshot = await getDoc(staffRef);
          if (staffSnapshot.exists()) {
            staffData[staffId] = staffSnapshot.data(); // Save the staff info
          }
        });

        await Promise.all(staffPromises);

        // Add the event data with staff info
        eventData.staffInfo = eventStaffIds.map(
          (staffId) => staffData[staffId]
        );
        eventsData.push(eventData);
      }

      setEvents(eventsData); // Store event data
      setStaffMembers(staffData); // Store all staff info in one state
      setLoading(false); // Finished loading
    } catch (error) {
      console.error("Error fetching specials: ", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpecialEvents();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      {events.length === 0 ? (
        <p>No special events found.</p>
      ) : (
        <div>
          {events.map((event) => (
            <div
              key={event.id}
              style={{ borderBottom: "1px solid #ccc", marginBottom: "20px" }}
            >
              <h2>
                {event.eventType} - {event.event}
              </h2>
              <p>
                <strong>Contact Person:</strong> {event.contactPerson}
              </p>
              <p>
                <strong>Email:</strong> {event.contactEmail}
              </p>
              <p>
                <strong>Phone:</strong> {event.contactPhone}
              </p>
              <p>
                <strong>Start Time:</strong>{" "}
                {new Date(event.startTime.seconds * 1000).toLocaleString()}
              </p>
              <p>
                <strong>End Time:</strong>{" "}
                {new Date(event.endTime.seconds * 1000).toLocaleString()}
              </p>
              <p>
                <strong>Order Complete:</strong>{" "}
                {event.orderComplete ? "Yes" : "No"}
              </p>
              <p>
                <strong>Payment Info:</strong> {event.payment}
              </p>
              <p>
                <strong>Details:</strong> {event.orderDetails}
              </p>

              <h4>Staff:</h4>
              <ul>
                {event.staffInfo && event.staffInfo.length > 0 ? (
                  event.staffInfo.map((staff, index) => (
                    <li key={index}>
                      {staff
                        ? `${staff.firstName} ${staff.lastName}`
                        : "Unknown staff member"}
                    </li>
                  ))
                ) : (
                  <li>No staff assigned.</li>
                )}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Specials;
