// FeedbackForm.js
import React from "react";
import styled from "styled-components";

const FeedbackContainer = styled.div`
  margin-top: 16px;
  display: flex;
  flex-direction: column;
`;

const FeedbackTextarea = styled.textarea`
  width: 100%;
  height: 80px;
  padding: 8px;
  font-size: 16px;
  margin-bottom: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  resize: none;
`;

const StyledButton = styled.button`
  text-transform: uppercase;
  background-color: #f0f0f0;
  color: #333;
  border: 1px solid #ccc;
  padding: 8px 16px;
  font-size: 16px;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: #d9d9d9;
  }
`;

const FeedbackForm = ({
  feedbackText,
  setFeedbackText,
  onSubmit,
  submitterName,
  setSubmitterName,
}) => {
  return (
    <FeedbackContainer>
      <input
        type="text"
        placeholder="Your name"
        value={submitterName || ""}
        onChange={(e) => setSubmitterName(e.target.value)}
        style={{
          padding: "8px",
          fontSize: "16px",
          marginBottom: "8px",
          border: "1px solid #ccc",
          borderRadius: "4px",
        }}
      />
      <FeedbackTextarea
        value={feedbackText || ""}
        onChange={(e) => setFeedbackText(e.target.value)}
        placeholder="Enter your feedback here..."
      />
      <StyledButton onClick={onSubmit}>Submit</StyledButton>
    </FeedbackContainer>
  );
};

export default FeedbackForm;
