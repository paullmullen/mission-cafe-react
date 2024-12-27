import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { db } from "../firebase/firebase"; // Correct Firebase import
import {
  query,
  collection,
  getDocs,
  updateDoc,
  doc,
  arrayUnion,
  orderBy,
} from "firebase/firestore";
import { toast } from "react-toastify";

// Styled Components
const MaintenanceContainer = styled.div`
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const MaintenanceTask = styled.div`
  background-color: #f9f9f9;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
`;

const TaskHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const TaskName = styled.h3`
  font-size: 1.5rem;
  color: #333;
`;

const TaskInterval = styled.span`
  padding: 5px 10px;
  border-radius: 5px;
  text-align: right;
`;

const InstructionsList = styled.div`
  margin-top: 10px;
`;

const InstructionWrapper = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 8px;
`;

const InstructionText = styled.span`
  font-size: 1rem;
  margin-left: 8px;
`;

const CompletedList = styled.ul`
  margin-top: 15px;
`;

const CompletedItem = styled.li`
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 10px;
`;

const ToggleButton = styled.button`
  margin-top: 10px;
  padding: 5px 10px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  &:hover {
    background-color: #0056b3;
  }
`;

const SaveButton = styled.button`
  margin-top: 10px;
  padding: 5px 10px;
  background-color: #28a745;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  &:hover {
    background-color: #218838;
  }
`;

const OverdueInterval = styled.span`
  background-color: red;
  color: white;
  padding: 5px 10px;
  border-radius: 5px;
  text-align: right;
  width: 100%;
  display: block;
`;

const Input = styled.input`
  font-family: Arial, sans-serif;
  font-size: 1rem;
  padding: 8px;
  width: 100%;
  margin-top: 10px;
  border: 1px solid #ccc;
  border-radius: 5px;

  &::placeholder {
    font-family: Arial, sans-serif;
    font-size: 1rem;
  }
`;

const TextArea = styled.textarea`
  font-family: Arial, sans-serif;
  font-size: 1rem;
  padding: 8px;
  width: 100%;
  margin-top: 10px;
  border: 1px solid #ccc;
  border-radius: 5px;

  &::placeholder {
    font-family: Arial, sans-serif;
    font-size: 1rem;
  }
`;

const HistoryToggleWrapper = styled.div`
  margin-top: 20px;
  font-weight: bold;
  display: flex;
  align-items: center;
  gap: 8px;
`;

// Fetch maintenance data from Firestore
const fetchMaintenanceData = async (setMaintenanceData, setLoading) => {
  setLoading(true);
  try {
    const q = query(collection(db, "maintenance"), orderBy("name"));
    const querySnapshot = await getDocs(q);
    const data = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setMaintenanceData(data);
  } catch (error) {
    toast.error("Error fetching maintenance tasks");
  } finally {
    setLoading(false);
  }
};

// Add completion entry to Firestore
const addCompletionToHistory = async (taskId, completedData) => {
  const taskRef = doc(db, "maintenance", taskId);
  try {
    await updateDoc(taskRef, {
      completed: arrayUnion(completedData),
    });
    toast.success("Completion added successfully");
  } catch (error) {
    toast.error("Error adding completion");
  }
};

// Calculate task status based on interval and last performed date
const calculateTaskStatus = (lastPerformedDate, intervalDays) => {
  if (!lastPerformedDate) {
    return `Interval: ${intervalDays} days \nNot yet performed`;
  }

  const lastDate = new Date(lastPerformedDate.seconds * 1000);
  const nextDueDate = new Date(lastDate);
  nextDueDate.setDate(nextDueDate.getDate() + intervalDays);

  const today = new Date();
  const daysDifference = Math.ceil(
    (nextDueDate - today) / (1000 * 60 * 60 * 24)
  );

  return daysDifference > 0 ? (
    <>
      Interval: {intervalDays} days
      <br />
      Due in {daysDifference} day(s)
    </>
  ) : (
    <OverdueInterval>
      Interval: {intervalDays} days
      <br />
      {Math.abs(daysDifference)} day(s) overdue
    </OverdueInterval>
  );
};

const MaintenancePage = () => {
  const [maintenanceData, setMaintenanceData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ by: "", notes: "" });
  const [checkedInstructions, setCheckedInstructions] = useState({});
  const [showHistory, setShowHistory] = useState({});

  useEffect(() => {
    fetchMaintenanceData(setMaintenanceData, setLoading);
  }, []);

  useEffect(() => {
    const initialCheckedState = {};
    maintenanceData.forEach((task) => {
      initialCheckedState[task.id] = task.instructions.map(() => false);
    });
    setCheckedInstructions(initialCheckedState);
  }, [maintenanceData]);

  const handleCheckboxChange = (taskId, index) => {
    setCheckedInstructions((prev) => ({
      ...prev,
      [taskId]: prev[taskId].map((checked, i) =>
        i === index ? !checked : checked
      ),
    }));
  };

  const handleToggleCompleted = (taskId) => {
    setShowHistory((prevState) => ({
      ...prevState,
      [taskId]: !prevState[taskId],
    }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (taskId) => {
    const completedData = {
      by: formData.by,
      date: new Date(),
      notes: formData.notes,
    };

    addCompletionToHistory(taskId, completedData);
    setFormData({ by: "", notes: "" });

    // Reset the checkboxes after submitting
    setCheckedInstructions((prev) => ({
      ...prev,
      [taskId]: prev[taskId].map(() => false),
    }));
  };

  return (
    <MaintenanceContainer>
      <h1>Maintenance Tasks</h1>
      {loading && <p>Loading...</p>}
      {!loading && maintenanceData.length === 0 && (
        <p>No maintenance tasks found</p>
      )}
      {!loading &&
        maintenanceData.map((task) => {
          const allChecked = task.instructions.every(
            (_, index) => checkedInstructions[task.id]?.[index]
          );

          return (
            <MaintenanceTask key={task.id}>
              <TaskHeader>
                <TaskName>{task.name}</TaskName>
                <TaskInterval>
                  {calculateTaskStatus(
                    task.completed?.[task.completed.length - 1]?.date,
                    task.intervalDays
                  )}
                </TaskInterval>
              </TaskHeader>
              <div>
                <h4>Instructions:</h4>
                <InstructionsList>
                  {task.instructions.map((inst, index) => (
                    <InstructionWrapper key={index}>
                      <input
                        type="checkbox"
                        checked={checkedInstructions[task.id]?.[index] || false}
                        onChange={() => handleCheckboxChange(task.id, index)}
                      />
                      {inst.type === "image" ? (
                        <img
                          src={inst.text}
                          alt="Instruction"
                          style={{
                            maxWidth: "100%",
                            maxHeight: "200px",
                            marginLeft: "8px",
                          }}
                        />
                      ) : (
                        <InstructionText
                          dangerouslySetInnerHTML={{ __html: inst.text }}
                        />
                      )}
                    </InstructionWrapper>
                  ))}
                </InstructionsList>
              </div>
              {allChecked && (
                <div>
                  <div>
                    <Input
                      type="text"
                      name="by"
                      placeholder="Name"
                      value={formData.by}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <TextArea
                      name="notes"
                      placeholder="Notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                    />
                  </div>
                  <SaveButton onClick={() => handleSubmit(task.id)}>
                    Save
                  </SaveButton>
                </div>
              )}
              <HistoryToggleWrapper>
                <input
                  type="checkbox"
                  checked={showHistory[task.id] || false}
                  onChange={() => handleToggleCompleted(task.id)}
                />
                <span>
                  {showHistory[task.id] ? "Hide History" : "Show History"}
                </span>
              </HistoryToggleWrapper>

              {showHistory[task.id] && (
                <CompletedList>
                  {task.completed?.length ? (
                    task.completed.map((entry, index) => (
                      <CompletedItem key={index}>
                        <strong>{entry.by}</strong> -{" "}
                        {new Date(
                          entry.date.seconds * 1000
                        ).toLocaleDateString()}
                        <br />
                        {entry.notes && <em>{entry.notes}</em>}
                      </CompletedItem>
                    ))
                  ) : (
                    <p>No completions yet.</p>
                  )}
                </CompletedList>
              )}
            </MaintenanceTask>
          );
        })}
    </MaintenanceContainer>
  );
};

export default MaintenancePage;
