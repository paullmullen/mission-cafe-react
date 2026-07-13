import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Spin, message as toast } from "antd";
import { db } from "../firebase/firebase";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import styled from "styled-components";

const Container = styled.div`
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
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
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const docRef = useMemo(
    () => doc(db, "managerMessages", "currentMessage"),
    []
  );

  useEffect(() => {
    const fetchMessage = async () => {
      setLoading(true);

      try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setMessageText(docSnap.data().message || "");
        }
      } catch (error) {
        console.error(error);
        toast.error("Failed to fetch the manager's message.");
      } finally {
        setLoading(false);
      }
    };

    fetchMessage();
  }, [docRef]);

  const saveMessage = async () => {
    setSaving(true);

    try {
      await setDoc(
        docRef,
        {
          message: messageText,
          lastUpdated: serverTimestamp(),
        },
        { merge: true }
      );
      toast.success("Message saved successfully.");
    } catch (error) {
      console.error(error);
      toast.error("Failed to save the message.");
    } finally {
      setSaving(false);
    }
  };

  const handleEditorChange = useCallback((value) => {
    setMessageText(value);
  }, []);

  return (
    <Container>
      <h1>Manager's Message</h1>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
          <Spin size="large" />
        </div>
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
            loading={saving}
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
