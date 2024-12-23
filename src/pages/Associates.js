import React, { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../firebase/firebase";
import styled from "styled-components";
import { CheckCircleOutlined, UserSwitchOutlined } from "@ant-design/icons";

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

const AssociatesPage = () => {
  const [associates, setAssociates] = useState([]);

  useEffect(() => {
    const fetchAssociates = async () => {
      const associatesCollection = collection(db, "associates");

      // Creating the query with orderBy
      const q = query(associatesCollection, orderBy("lastName"));

      const snapshot = await getDocs(q);
      const associatesList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAssociates(associatesList);
    };

    fetchAssociates();
  }, []);

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
                  {associate.lastName}, {associate.firstName}
                </AssociateName>
                <AssociateLine>
                  {" "}
                  <a href={`mailto:${associate.email}`}>
                    {associate.email}
                  </a> - {associate.phone}
                </AssociateLine>
                <AssociateLine>{associate.availability}</AssociateLine>
                <AssociateLine>{associate.notes}</AssociateLine>
              </TableData>
            </AssociateRow>
          ))}
        </tbody>
      </Table>
    </Container>
  );
};

export default AssociatesPage;
