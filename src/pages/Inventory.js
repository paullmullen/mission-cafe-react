import React, { useState, useEffect } from "react";
import { Table, Input, message as toast } from "antd";
import { db } from "../firebase/firebase";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import styled from "styled-components";

// Styled Components
const PageContainer = styled.div`
  padding: 20px;
`;

const TableWrapper = styled.div`
  margin-top: 20px;
`;

const NotesInput = styled(Input.TextArea)`
  margin-top: 8px;
  width: 100%;
`;

const InventoryPage = () => {
  const [inventoryData, setInventoryData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch data from Firestore
  const fetchInventoryData = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "inventory"));
      const data = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setInventoryData(data);
    } catch (error) {
      toast.error("Error fetching inventory data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventoryData();
  }, []);

  // Handle current value changes
  const handleCurrentChange = async (id, value) => {
    try {
      const taskRef = doc(db, "inventory", id);
      await updateDoc(taskRef, { current: parseInt(value, 10) }); // Ensure current is treated as a number

      // Update the UI immediately
      setInventoryData((prevData) =>
        prevData.map((item) =>
          item.id === id ? { ...item, current: parseInt(value, 10) } : item
        )
      );
    } catch (error) {
      toast.error("Error updating inventory item");
      console.error(error);
    }
  };

  // Handle notes field change
  const handleNotesChange = (id, value) => {
    setInventoryData((prevData) =>
      prevData.map((item) =>
        item.id === id ? { ...item, notes: value } : item
      )
    );
  };

  // Handle notes field change on blur
  const handleNotesBlur = async (id, value) => {
    try {
      const taskRef = doc(db, "inventory", id);
      await updateDoc(taskRef, { notes: value });

      // Update the UI immediately
      setInventoryData((prevData) =>
        prevData.map((item) =>
          item.id === id ? { ...item, notes: value } : item
        )
      );
    } catch (error) {
      toast.error("Error updating notes");
      console.error(error);
    }
  };

  // Group inventory items by category and sort categories alphabetically
  const groupedInventoryData = inventoryData.reduce((acc, item) => {
    const { category } = item;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {});

  // Sort categories alphabetically
  const sortedCategories = Object.keys(groupedInventoryData).sort();

  // Table columns
  const columns = [
    {
      title: "Item",
      dataIndex: "name",
      key: "name",
      width: "20%",
      render: (text, record) => (
        <span
          style={{
            fontWeight: record.current < record.par ? "bold" : "normal",
            color: record.current < record.par ? "red" : "inherit",
          }}
        >
          {text}
        </span>
      ),
    },
    {
      title: "Par",
      dataIndex: "par",
      key: "par",
      width: "10%",
      render: (text) => <span>{parseInt(text, 10)}</span>, // Ensure 'par' is treated as a number
    },
    {
      title: "Current",
      dataIndex: "current",
      key: "current",
      width: "10%",
      render: (text, record) => (
        <Input
          type="number"
          value={text}
          onChange={(e) => handleCurrentChange(record.id, e.target.value)}
        />
      ),
    },
    {
      title: "Units",
      dataIndex: "units",
      key: "units",
      width: "10%",
      render: (text) => <span>{text}</span>,
    },
    {
      title: "Notes",
      dataIndex: "notes",
      key: "notes",
      render: (text, record) => (
        <NotesInput
          value={text}
          onChange={(e) => handleNotesChange(record.id, e.target.value)}
          onBlur={(e) => handleNotesBlur(record.id, e.target.value)}
          placeholder="Enter notes here"
        />
      ),
    },
  ];

  return (
    <PageContainer>
      <TableWrapper>
        {sortedCategories.map((category) => (
          <div key={category}>
            <h3>{category}</h3>
            <Table
              dataSource={groupedInventoryData[category]}
              columns={columns}
              rowKey="id"
              loading={loading}
              pagination={false}
              bordered
              rowClassName="editable-row"
              scroll={{ x: true }}
            />
          </div>
        ))}
      </TableWrapper>
    </PageContainer>
  );
};

export default InventoryPage;
