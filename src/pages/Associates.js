import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  updateDoc,
  addDoc,
} from "firebase/firestore";
import { db } from "../firebase/firebase";
import styled from "styled-components";
import {
  SecurityScanOutlined,
  UserSwitchOutlined,
  EditOutlined,
  DeleteOutlined,
  CloseCircleOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import { Modal } from "antd";

// Styled components
const Container = styled.div`
  margin: 20px;
  font-size: 1.5rem;
`;
const NewAssociateButton = styled.button`
  background-color: rgb(17, 17, 219);
  color: white;
  border: none;
  padding: 10px 20px;
  margin-bottom: 20px;
  font-size: 16px;
  cursor: pointer;
  border-radius: 5px;
  &:hover {
    background-color: rgb(17, 17, 219);
  }
`;
const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
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
  vertical-align: top;
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

const RoleCapsule = styled.span`
  display: inline-block;
  margin-left: 10px;
  padding: 2px 8px;
  background-color: ${(props) => props.color || "#ddd"};
  color: white;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
`;

const AssociatesPage = () => {
  const [associates, setAssociates] = useState([]);
  const [editing, setEditing] = useState({}); // To track which associate is being edited

  useEffect(() => {
    const fetchAssociates = async () => {
      const associatesCollection = collection(db, "associates");
      const q = query(associatesCollection, orderBy("lastName"));

      const snapshot = await getDocs(q);
      const associatesList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAssociates(associatesList.filter((associate) => !associate.deleted));
    };

    fetchAssociates();
  }, []);

  const handleChange = (e, id, field) => {
    const { value } = e.target;
    let formattedValue = value;

    if (field === "phone") {
      formattedValue = phoneFormatter(value);
    }

    if (field === "email" && !emailValidator(value)) {
      return;
    }

    const updatedAssociates = associates.map((associate) =>
      associate.id === id
        ? { ...associate, [field]: formattedValue }
        : associate
    );
    setAssociates(updatedAssociates);
  };

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

  const toggleEdit = (id) => {
    setEditing((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const phoneFormatter = (value) => {
    const cleaned = value.replace(/\D/g, "");
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      return `(${match[1]}) ${match[2]}-${match[3]}`;
    }
    return value;
  };

  const emailValidator = (value) => {
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return regex.test(value);
  };

  const handleDelete = async (id) => {
    Modal.confirm({
      title: "Are you sure you want to mark this associate as deleted?",
      content:
        "This action cannot be undone, but the associate will not be shown.",
      okText: "Yes, delete",
      cancelText: "Cancel",
      onOk: async () => {
        try {
          await updateDoc(doc(db, "associates", id), {
            deleted: true,
          });
          setAssociates(associates.filter((associate) => associate.id !== id));
          console.log("Associate marked as deleted.");
        } catch (error) {
          console.error("Error marking associate as deleted:", error);
        }
      },
    });
  };

  const handleNewAssociate = async () => {
    try {
      const newAssociateRef = await addDoc(collection(db, "associates"), {
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        birthdate: "",
        availability: "",
        notes: "",
        minor: false,
        backgroundCheck: "",
        backgroundCheckDate: "",
        deleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      setEditing((prev) => ({
        ...prev,
        [newAssociateRef.id]: true,
      }));

      const q = query(collection(db, "associates"), orderBy("lastName"));
      const snapshot = await getDocs(q);
      const associatesList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAssociates(associatesList.filter((associate) => !associate.deleted));
    } catch (error) {
      console.error("Error creating new associate:", error);
    }
  };

  const copyEmailsToClipboard = () => {
    const emailString = associates
      .map((associate) => associate.email)
      .filter((email) => email) // Filter out any undefined or null emails
      .join("; ");

    navigator.clipboard
      .writeText(emailString)
      .then(() => {})
      .catch((error) => {
        console.error("Error copying emails:", error);
      });
  };

  return (
    <Container>
      <NewAssociateButton onClick={handleNewAssociate}>
        Add New Associate
      </NewAssociateButton>
      <Table>
        <tbody>
          {associates.map((associate) => (
            <AssociateRow key={associate.id}>
              <TableData>
                <StatusIcon>
                  {new Date().getFullYear() -
                    new Date(associate.birthdate).getFullYear() <
                  15 ? (
                    <UserSwitchOutlined
                      style={{ fontSize: "20px", color: "lightgreen" }}
                    />
                  ) : // Check if the background check date is within the last 2 years
                  associate.backgroundCheckDate &&
                    new Date(associate.backgroundCheckDate.toDate()) >
                      new Date(
                        new Date().setFullYear(new Date().getFullYear() - 2)
                      ) ? (
                    <SecurityScanOutlined
                      style={{ fontSize: "20px", color: "green" }}
                    />
                  ) : (
                    <CloseCircleOutlined
                      style={{ fontSize: "20px", color: "red" }}
                    />
                  )}
                </StatusIcon>
              </TableData>
              <TableData>
                <AssociateName>
                  {editing[associate.id] ? (
                    <>
                      <EditableInput
                        type="text"
                        placeholder="Last Name"
                        value={associate.lastName}
                        onChange={(e) =>
                          handleChange(e, associate.id, "lastName")
                        }
                        onBlur={() => handleSave(associate.id, "lastName")}
                      />
                      <EditableInput
                        type="text"
                        placeholder="First Name"
                        value={associate.firstName}
                        onChange={(e) =>
                          handleChange(e, associate.id, "firstName")
                        }
                        onBlur={() => handleSave(associate.id, "firstName")}
                      />
                    </>
                  ) : (
                    <>
                      {associate.lastName}, {associate.firstName}
                    </>
                  )}
                  {associate.role && (
                    <RoleCapsule color={associate.role.color}>
                      {associate.role.name}
                    </RoleCapsule>
                  )}
                </AssociateName>
                <AssociateLine>
                  {editing[associate.id] ? (
                    <EditableInput
                      type="email"
                      placeholder="email"
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
                      placeholder="Phone Number"
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
                    <>
                      {
                        "Birth Date: (We ask for birthdate in compliance with Elmbrook's Child Protection Policy)"
                      }
                      <EditableInput
                        type="date"
                        value={associate.birthdate}
                        onChange={(e) =>
                          handleChange(e, associate.id, "birthdate")
                        }
                        onBlur={() => handleSave(associate.id, "birthdate")}
                      />
                    </>
                  ) : (
                    ""
                  )}
                </AssociateLine>
                <AssociateLine>
                  {editing[associate.id] ? (
                    <EditableInput
                      type="text"
                      placeholder="Availability"
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
                      placeholder="Notes"
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
                  {editing[associate.id] ? (
                    <SaveOutlined style={{ color: "green" }} />
                  ) : (
                    <EditOutlined />
                  )}
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
      <br></br>
      <NewAssociateButton onClick={copyEmailsToClipboard}>
        Copy Emails
      </NewAssociateButton>
    </Container>
  );
};

export default AssociatesPage;
