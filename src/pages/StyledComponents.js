import styled from "styled-components";

export const StyledPanelHeader = styled.span`
  font-size: 28px;
  font-weight: bold;
  color: ${({ temperature }) => {
    switch (temperature) {
      case "hot":
        return "rgb(200, 0, 0)";
      case "cold":
        return "rgb(0, 0, 175)";
      case "reference":
        return "rgb(200, 175, 0)";
      default:
        return "#222";
    }
  }};
`;

export const StyledSubtitle = styled.h3`
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 16px;
  color: #000;
`;

export const StyledListItem = styled.li`
  font-size: 20px;
  line-height: 1.6;
  margin-bottom: 12px;
`;

export const IngredientTable = styled.table`
  width: 100%;
  table-layout: fixed;
  margin-left: 16px;
  border-collapse: collapse;
`;

export const TableCell = styled.td`
  padding: 8px;
  text-align: left;
  word-break: break-word;
  font-size: 16px;
  border: none;
`;

export const IngredientName = styled.span`
  font-weight: bold;
  font-size: 22px;
`;

export const IngredientSize = styled.span`
  font-size: 16px;
`;

export const IngredientAmount = styled.span`
  font-size: 20px;
`;

export const StyledButton = styled.button`
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

export const ButtonContainer = styled.div`
  display: flex;
  justify-content: flex-start;
  gap: 16px;
  margin-top: 24px;
`;

export const FeedbackContainer = styled.div`
  margin-top: 16px;
  display: flex;
  flex-direction: column;
`;

export const FeedbackTextarea = styled.textarea`
  width: 100%;
  height: 80px;
  padding: 8px;
  font-size: 16px;
  margin-bottom: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  resize: none;
`;
