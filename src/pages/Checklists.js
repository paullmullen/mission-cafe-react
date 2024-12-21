import React, { useState, useEffect } from "react";
import {
  Tabs,
  Checkbox,
  Row,
  Col,
  Button,
  message as toast,
  Modal,
} from "antd";
import { db } from "../firebase/firebase"; // Adjust path as needed

import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  where,
  orderBy,
  writeBatch,
} from "firebase/firestore";
import styled from "styled-components";

const { TabPane } = Tabs;

// Styled Components
const ChecklistContainer = styled.div`
  padding: 20px;
`;

const TabWrapper = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const ChecklistRow = styled(Row)`
  margin-bottom: 12px;
`;

const ChecklistText = styled(Col)`
  font-size: 16px;
`;

const ChecklistCheckbox = styled(Col)`
  font-size: 16px;
`;

const ClearButton = styled(Button)`
  font-size: 16px;
`;

const ChecklistHeader = styled.h3`
  font-size: 16px;
  margin-bottom: 8px;
`;

const ModalText = styled.p`
  font-size: 16px;
`;

const Checklists = () => {
  const [checklistData, setChecklistData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clearModalVisible, setClearModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState("Opening");

  const fetchChecklistData = async (category) => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "checklists"),
        where("category", "==", category),
        orderBy("order")
      );
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setChecklistData(data);
    } catch (error) {
      toast.error("Error fetching checklists");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChecklistData(activeTab);
  }, [activeTab]);

  const handleCheckboxChange = async (taskId, checked) => {
    try {
      const taskRef = doc(db, "checklists", taskId);
      await updateDoc(taskRef, { complete: checked });

      // Update the local state to reflect the change in the UI immediately
      setChecklistData((prevData) =>
        prevData.map((task) =>
          task.id === taskId ? { ...task, complete: checked } : task
        )
      );
    } catch (error) {
      toast.error("Error updating checklist item");
      console.log(error);
    }
  };

  const handleClearAll = async () => {
    try {
      // Initialize batch
      const batch = writeBatch(db);

      // For each checklist task, update the `complete` field to false
      checklistData.forEach((task) => {
        const taskRef = doc(db, "checklists", task.id);
        batch.update(taskRef, { complete: false });
      });

      // Commit the batch
      await batch.commit();

      // Optionally: Update local state after clearing all
      setChecklistData((prevData) =>
        prevData.map((task) => ({ ...task, complete: false }))
      );

      toast.success("All tasks have been reset.");

      // Close the modal after the reset
      closeClearModal();
    } catch (error) {
      toast.error("Error resetting tasks.");
      console.error("Error resetting tasks:", error);
    }
  };

  const openClearModal = () => {
    setClearModalVisible(true);
  };

  const closeClearModal = () => {
    setClearModalVisible(false);
  };

  const renderChecklistItems = (category) => {
    const filteredData = checklistData.filter(
      (item) => item.category === category
    );
    const groupedData = filteredData.reduce((acc, item) => {
      if (!acc[item.subCategory]) {
        acc[item.subCategory] = [];
      }
      acc[item.subCategory].push(item);
      return acc;
    }, {});

    return Object.keys(groupedData).map((subCategory) => (
      <div key={subCategory}>
        <ChecklistHeader>{subCategory}</ChecklistHeader>
        {groupedData[subCategory].map((task) => (
          <ChecklistRow key={task.id} align="middle">
            <ChecklistCheckbox span={2}>
              <Checkbox
                checked={task.complete}
                onChange={(e) => {
                  handleCheckboxChange(task.id, e.target.checked);
                }}
              />
            </ChecklistCheckbox>
            <ChecklistText span={22}>{task.text}</ChecklistText>
          </ChecklistRow>
        ))}
      </div>
    ));
  };

  return (
    <ChecklistContainer>
      <TabWrapper>
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key)}
          style={{ flex: 1 }}
        >
          <TabPane tab="Opening" key="Opening" />
          <TabPane tab="Closing" key="Closing" />
        </Tabs>
        <ClearButton
          type="primary"
          danger
          onClick={openClearModal}
          style={{ marginLeft: "20px" }}
        >
          Reset Checklist
        </ClearButton>
      </TabWrapper>

      {loading ? <div>Loading...</div> : renderChecklistItems(activeTab)}

      <Modal
        title="Reset Checklist Items"
        visible={clearModalVisible}
        onOk={handleClearAll}
        onCancel={closeClearModal}
        okText="Yes, Reset"
        cancelText="Cancel"
      >
        <ModalText>
          Are you sure you want to reset all checklist items to unchecked?
        </ModalText>
      </Modal>
    </ChecklistContainer>
  );
};

export default Checklists;
