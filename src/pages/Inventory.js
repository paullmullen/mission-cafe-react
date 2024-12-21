import React, { useState, useEffect } from "react";
import { Table, Input, Button, message as toast } from "antd";
import { db } from "../firebase/firebase";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  getDoc,
} from "firebase/firestore";
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

const ExtraNotesContainer = styled.div`
  margin-top: 20px;
`;

const InventoryPage = () => {
  const [inventoryData, setInventoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [extraNotes, setExtraNotes] = useState(""); // State variable for extra notes

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

  const fetchExtraNotes = async () => {
    try {
      const docRef = doc(db, "notes", "currentNote");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setExtraNotes(docSnap.data().note || ""); // Set initial value for extraNotes
      }
    } catch (error) {
      toast.error("Error fetching extra notes");
    }
  };

  useEffect(() => {
    fetchInventoryData();
    fetchExtraNotes();
  }, []);

  // Handle changes in current value
  const handleCurrentChange = async (id, value) => {
    try {
      const inventoryRef = doc(db, "inventory", id);
      await updateDoc(inventoryRef, { current: parseInt(value, 10) });
      setInventoryData((prevData) =>
        prevData.map((item) =>
          item.id === id ? { ...item, current: parseInt(value, 10) } : item
        )
      );
    } catch (error) {
      toast.error("Error updating current value");
      console.error(error);
    }
  };

  // Handle changes in notes
  const handleNotesChange = (id, value) => {
    setInventoryData((prevData) =>
      prevData.map((item) =>
        item.id === id ? { ...item, notes: value } : item
      )
    );
  };

  // Handle blur event for notes (save changes to Firestore)
  const handleNotesBlur = async (id, value) => {
    try {
      const inventoryRef = doc(db, "inventory", id);
      await updateDoc(inventoryRef, { notes: value });
    } catch (error) {
      toast.error("Error saving notes");
      console.error(error);
    }
  };

  // Send email to managers
  const sendEmailToManagers = async () => {
    try {
      let htmlContent = "<h3>Mission Cafe Inventory Update</h3>";

      // Iterate over categories and create tables for each category
      for (const category of sortedCategories) {
        htmlContent += `<h4>${category}</h4>`;
        htmlContent += `
        <table border='1' style='border-collapse: collapse; width: 100%;'>
          <thead>
            <tr>
              <th style="width: 30%; text-align: left;">Item</th>
              <th style="width: 10%; text-align: right;">Par</th>
              <th style="width: 10%; text-align: right;">Current</th>
              <th style="width: 10%; text-align: right;">Units</th>
              <th style="width: 40%; text-align: left;">Notes</th>
            </tr>
          </thead>
          <tbody>`;

        groupedData[category].forEach((item) => {
          const isBelowPar = item.current < item.par;
          htmlContent += `
          <tr style="background-color: ${isBelowPar ? "#f8d7da" : "white"};">
            <td style="color: ${isBelowPar ? "red" : "black"}; font-weight: ${
            isBelowPar ? "bold" : "normal"
          };">${item.name}</td>
            <td style="text-align: right;">${item.par}</td>
            <td style="color: ${isBelowPar ? "red" : "black"}; font-weight: ${
            isBelowPar ? "bold" : "normal"
          }; text-align: right;">${item.current}</td>
            <td style="text-align: right;">${item.units}</td>
            <td>${item.notes || "N/A"}</td>
          </tr>`;
        });

        htmlContent += `
  </tbody>
</table>
<br/>
<h2>Additional Notes</h2>
<p>${extraNotes}</p>
`;
      }

      let textContent = "Mission Cafe Inventory Update\n\n";
      for (const category of sortedCategories) {
        textContent += `${category}:\n\n`;
        groupedData[category].forEach((item) => {
          textContent += `Item: ${item.name}\nPar: ${item.par}\nCurrent: ${
            item.current
          }\nUnits: ${item.units}\nNotes: ${item.notes || "N/A"}\n\n`;
        });
      }

      const managersSnapshot = await getDocs(collection(db, "managers"));
      const managersEmails = managersSnapshot.docs.map(
        (doc) => doc.data().email
      );

      await addDoc(collection(db, "mail"), {
        to: managersEmails,
        message: {
          subject: "Mission Cafe Inventory Update",
          text: textContent,
          html: htmlContent,
        },
      });

      toast.success("Inventory sent to managers!");
    } catch (error) {
      toast.error("Error sending inventory email");
      console.error(error);
    }
  };

  // Group inventory by categories
  const groupedData = inventoryData.reduce((acc, item) => {
    acc[item.category] = acc[item.category] || [];
    acc[item.category].push(item);
    return acc;
  }, {});

  const sortedCategories = Object.keys(groupedData).sort();

  const updateExtraNotesInFirestore = async (newNotes) => {
    try {
      const docRef = doc(db, "notes", "currentNote");
      await updateDoc(docRef, { note: newNotes });
      toast.success("Notes updated successfully");
    } catch (error) {
      toast.error("Error updating notes in Firestore");
    }
  };

  const handleBlur = async (e) => {
    const newNotes = e.target.value;
    setExtraNotes(newNotes); // Update state
    await updateExtraNotesInFirestore(newNotes); // Update Firestore
  };

  return (
    <PageContainer>
      {sortedCategories.map((category) => (
        <TableWrapper key={category}>
          <h3>{category}</h3>
          <Table
            dataSource={groupedData[category]}
            columns={[
              {
                title: "Item",
                dataIndex: "name",
                key: "name",
                render: (text, record) => (
                  <span
                    style={{
                      fontWeight:
                        record.current < record.par ? "bold" : "normal",
                      color: record.current < record.par ? "red" : "black",
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
              },
              {
                title: "Current",
                dataIndex: "current",
                key: "current",
                render: (text, record) => (
                  <Input
                    type="number"
                    value={text}
                    onChange={(e) =>
                      handleCurrentChange(record.id, e.target.value)
                    }
                  />
                ),
              },
              {
                title: "Units",
                dataIndex: "units",
                key: "units",
              },
              {
                title: "Notes",
                dataIndex: "notes",
                key: "notes",
                render: (text, record) => (
                  <NotesInput
                    value={text}
                    onChange={(e) =>
                      handleNotesChange(record.id, e.target.value)
                    }
                    onBlur={(e) => handleNotesBlur(record.id, e.target.value)}
                    placeholder="Enter notes here"
                  />
                ),
              },
            ]}
            rowKey="id"
            loading={loading}
            pagination={false}
            bordered
            rowClassName="editable-row"
            scroll={{ x: true }}
          />
        </TableWrapper>
      ))}

      <ExtraNotesContainer>
        <NotesInput
          value={extraNotes} // Bind to state variable
          onChange={(e) => setExtraNotes(e.target.value)} // Update state as user types
          onBlur={handleBlur} // Call handleBlur onBlur to update Firestore
          placeholder="Enter additional notes here"
          rows={4}
        />
      </ExtraNotesContainer>
      <Button
        type="primary"
        onClick={sendEmailToManagers}
        style={{ marginTop: 20 }}
      >
        Send Inventory to Managers
      </Button>
    </PageContainer>
  );
};

export default InventoryPage;
