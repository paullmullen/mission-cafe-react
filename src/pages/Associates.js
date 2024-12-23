import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase/firebase";
import styled from "styled-components";
import {
  CheckCircleOutlined,
  UserSwitchOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { Modal } from "antd";

// Styled components
const Container = styled.div`
  margin: 20px;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const TableHead = styled.th`
  padding: 10px;
  text-align: left;
  font-weight: bold;
`;

const TableRow = styled.tr`
  border-bottom: 1px solid #ddd;
`;

const TableData = styled.td`
  padding: 10px;
`;

const StatusIcon = styled.span`
  display: inline-block;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: ${(props) => props.color || "transparent"};
`;

const AssociateRow = styled.tr`
  cursor: pointer;
`;

const AssociateName = styled.div`
  font-weight: bold;
`;

const AssociateLine = styled.div`
  margin-bottom: 5px;
`;

const EditableInput = styled.input`
  border: 1px solid #ccc;
  padding: 5px;
  width: 100%;
  box-sizing: border-box;
`;

const EditButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  font-size: 16px;
  color: #007bff;
`;

const DeleteButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  font-size: 16px;
  color: red;
  margin-left: 10px;
`;

const AssociatesPage = () => {
  const [associates, setAssociates] = useState([]);
  const [editing, setEditing] = useState({}); // To track which associate is being edited

  useEffect(() => {
    const fetchAssociates = async () => {
      const associatesCollection = collection(db, "associates");

      // Creating the query with orderBy and filtering out deleted associates
      const q = query(associatesCollection, orderBy("lastName"));

      const snapshot = await getDocs(q);
      const associatesList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      // Filter out the deleted associates
      setAssociates(associatesList.filter((associate) => !associate.deleted));
    };

    fetchAssociates();
  }, []);

  // Function to handle the inline editing of the fields
  const handleChange = (e, id, field) => {
    const updatedAssociates = associates.map((associate) =>
      associate.id === id
        ? { ...associate, [field]: e.target.value }
        : associate
    );
    setAssociates(updatedAssociates);
  };

  // Function to save the edited data to Firestore
  const handleSave = async (id, field) => {
    const associate = associates.find((a) => a.id === id);
    if (!associate) return;

    try {
      await updateDoc(doc(db, "associates", id), {
        [field]: associate[field],
      });
      console.log(`${field} updated successfully.`);
    } catch (error) {
      console.error("Error updating field:", error);
    }
  };

  // Function to toggle the edit mode for a specific associate
  const toggleEdit = (id) => {
    setEditing((prev) => ({
      ...prev,
      [id]: !prev[id], // Toggle the edit mode for this associate
    }));
  };

  // Function to handle the delete operation (soft delete - set deleted to true)
  const handleDelete = async (id) => {
    Modal.confirm({
      title: "Sure?",
      content: "Are you sure you want to mark this associate as deleted?",
      okText: "Yes, delete",
      cancelText: "Cancel",
      onOk: async () => {
        try {
          await updateDoc(doc(db, "associates", id), {
            deleted: true, // Mark as deleted
          });
          // Remove from the state by filtering out the deleted associate
          setAssociates(associates.filter((associate) => associate.id !== id));
          console.log("Associate marked as deleted.");
        } catch (error) {
          console.error("Error marking associate as deleted:", error);
        }
      },
    });
  };

  return (
    <Container>
      <Table>
        <tbody>
          {associates.map((associate) => (
            <AssociateRow key={associate.id}>
              <TableData>
                <StatusIcon
                  color={
                    associate.backgroundCheckDate
                      ? "green"
                      : associate.minor
                      ? "lightgreen"
                      : "transparent"
                  }
                >
                  {associate.backgroundCheckDate ? (
                    <CheckCircleOutlined style={{ color: "green" }} />
                  ) : associate.minor ? (
                    <UserSwitchOutlined style={{ color: "green" }} />
                  ) : (
                    ""
                  )}
                </StatusIcon>
              </TableData>
              <TableData>
                <AssociateName>
                  {editing[associate.id] ? (
                    <>
                      <EditableInput
                        type="text"
                        value={associate.firstName}
                        onChange={(e) =>
                          handleChange(e, associate.id, "firstName")
                        }
                        onBlur={() => handleSave(associate.id, "firstName")}
                      />
                      <EditableInput
                        type="text"
                        value={associate.lastName}
                        onChange={(e) =>
                          handleChange(e, associate.id, "lastName")
                        }
                        onBlur={() => handleSave(associate.id, "lastName")}
                      />
                    </>
                  ) : (
                    <>
                      {associate.firstName} {associate.lastName}
                    </>
                  )}
                </AssociateName>
                <AssociateLine>
                  {editing[associate.id] ? (
                    <EditableInput
                      type="email"
                      value={associate.email}
                      onChange={(e) => handleChange(e, associate.id, "email")}
                      onBlur={() => handleSave(associate.id, "email")}
                    />
                  ) : (
                    <a href={`mailto:${associate.email}`}>{associate.email}</a>
                  )}
                </AssociateLine>
                <AssociateLine>
                  {editing[associate.id] ? (
                    <EditableInput
                      type="tel"
                      value={associate.phone}
                      onChange={(e) => handleChange(e, associate.id, "phone")}
                      onBlur={() => handleSave(associate.id, "phone")}
                    />
                  ) : (
                    associate.phone
                  )}
                </AssociateLine>
                <AssociateLine>
                  {editing[associate.id] ? (
                    <EditableInput
                      type="text"
                      value={associate.availability}
                      onChange={(e) =>
                        handleChange(e, associate.id, "availability")
                      }
                      onBlur={() => handleSave(associate.id, "availability")}
                    />
                  ) : (
                    associate.availability
                  )}
                </AssociateLine>
                <AssociateLine>
                  {editing[associate.id] ? (
                    <EditableInput
                      type="text"
                      value={associate.notes}
                      onChange={(e) => handleChange(e, associate.id, "notes")}
                      onBlur={() => handleSave(associate.id, "notes")}
                    />
                  ) : (
                    associate.notes
                  )}
                </AssociateLine>
              </TableData>
              <TableData>
                <EditButton onClick={() => toggleEdit(associate.id)}>
                  <EditOutlined />
                </EditButton>
                {editing[associate.id] && (
                  <DeleteButton onClick={() => handleDelete(associate.id)}>
                    <DeleteOutlined />
                  </DeleteButton>
                )}
              </TableData>
            </AssociateRow>
          ))}
        </tbody>
      </Table>
    </Container>
  );
};

export default AssociatesPage;
