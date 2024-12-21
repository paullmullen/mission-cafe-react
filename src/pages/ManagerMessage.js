import React, { useState, useEffect } from "react";
import { db } from "../firebase"; // Adjust path as per your setup
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import styled from "styled-components";
import { Button, Input, message as toast } from "antd";

const Container = styled.div`
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
`;

const PasswordInput = styled(Input.Password)`
  margin-bottom: 16px;
  width: 100%;
`;

const StyledEditor = styled.div`
  margin-top: 16px;
  border: 1px solid #ccc;
  border-radius: 8px;
  .ql-container {
    min-height: 200px;
  }
`;

const ManagerMessage = () => {
  const [message, setMessage] = useState("");
  const [password, setPassword] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const docRef = doc(db, "managerMessages", "currentMessage");
  const managerPassword = "securepassword"; // Replace with a secure approach

  // Fetch the message from Firestore
  useEffect(() => {
    const fetchMessage = async () => {
      try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setMessage(docSnap.data().message || "");
        }
      } catch (error) {
        console.error("Error fetching manager message:", error);
      }
    };

    fetchMessage();
  }, []);

  // Save the message to Firestore
  const saveMessage = async () => {
    try {
      await setDoc(docRef, {
        message,
        lastUpdated: serverTimestamp(),
      });
      toast.success("Message saved successfully!");
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving message:", error);
      toast.error("Failed to save message.");
    }
  };

  // Handle password validation
  const handlePasswordSubmit = () => {
    if (password === managerPassword) {
      setIsEditing(true);
      toast.success("Editing enabled!");
    } else {
      toast.error("Incorrect password.");
    }
  };

  return (
    <Container>
      <h1>Manager's Message</h1>
      {!isEditing && (
        <>
          <div dangerouslySetInnerHTML={{ __html: message }} />
          <PasswordInput
            placeholder="Enter password to edit"
            onChange={(e) => setPassword(e.target.value)}
            onPressEnter={handlePasswordSubmit}
          />
          <Button onClick={handlePasswordSubmit} type="primary">
            Unlock Editor
          </Button>
        </>
      )}
      {isEditing && (
        <>
          <StyledEditor>
            <ReactQuill value={message} onChange={setMessage} />
          </StyledEditor>
          <Button
            onClick={saveMessage}
            type="primary"
            style={{ marginTop: 16 }}
          >
            Save Message
          </Button>
        </>
      )}
    </Container>
  );
};

export default ManagerMessage;
