import React, { useState, useEffect, useCallback, useMemo } from "react";
import { db } from "../firebase/firebase"; // Adjust path as per your setup
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
  const [messageText, setMessageText] = useState("");
  const [password, setPassword] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const docRef = useMemo(
    () => doc(db, "managerMessages", "currentMessage"),
    []
  );

  const managerPassword = "paul"; // Replace with a secure approach

  // Fetch the message from Firestore
  useEffect(() => {
    const fetchMessage = async () => {
      setLoading(true);
      try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const fetchedMessage = docSnap.data().message || "";
          setMessageText(fetchedMessage);
        } else {
        }
      } catch (error) {
        toast.error("Failed to fetch the manager's message.");
      } finally {
        setLoading(false);
      }
    };

    fetchMessage();
  }, [docRef]);

  // Save the message to Firestore
  const saveMessage = async () => {
    if (!messageText) return;

    try {
      await setDoc(docRef, {
        message: messageText,
        lastUpdated: serverTimestamp(),
      });
      toast.success("Message saved successfully.");
    } catch (error) {
      toast.error("Failed to save the message.");
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

  // Handle editor change with useCallback for stability
  const handleEditorChange = useCallback((value) => {
    setMessageText(value);
  }, []);

  return (
    <Container>
      <h1>Manager's Message</h1>
      {loading ? (
        <p>Loading...</p>
      ) : !isEditing ? (
        <>
          <div dangerouslySetInnerHTML={{ __html: messageText }} />
          <PasswordInput
            placeholder="Enter password to edit"
            onChange={(e) => setPassword(e.target.value)}
            onPressEnter={handlePasswordSubmit}
          />
          <Button onClick={handlePasswordSubmit} type="primary">
            Unlock Editor
          </Button>
        </>
      ) : (
        <>
          <StyledEditor>
            <ReactQuill
              value={messageText}
              onChange={handleEditorChange}
              theme="snow"
            />
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
