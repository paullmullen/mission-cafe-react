// SidebarElements.js

import styled from "styled-components";
import { Link } from "react-router-dom";
import { showSidebar } from "./Sidebar";
import * as FaIcons from "react-icons/fa";

export const Nav = styled.div`
  background: #15171c;
  height: 80px;
  display: flex;
  justify-content: flex-start;
  align-items: center;
`;

// export const NavIcon = styled(LinkR)`
//   margin-left: 2rem;
//   font-size: 2rem;
//   background: none;
//   color: #fff;
// `;

const NavIcon = styled(Link)`
  font-size: 2rem;
  height: 3rem;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: #252831;
  }

  /* Pass the onClick prop */
  ${(props) => props.onClick && `cursor: pointer;`}
`;

export const SidebarNav = styled.div`
  background: #15171c;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  position: fixed;
  top: 0;
  left: ${({ $sidebar }) => {
    console.log("Sidebar prop:", $sidebar); // Debugging
    return $sidebar ? "0" : "-100%";
  }};
  transition: 0.3s ease-in-out;
`;

export const SidebarWrap = styled.div`
  width: 100%;
`;

export const SidebarLink = styled(Link)`
  display: flex;
  align-items: center;
  padding: 20px;
  text-decoration: none;
  color: #fff;
  font-weight: 500;
  transition: 0.2s ease-in-out;

  &:hover {
    background: #252831;
    border-radius: 4px;
  }
`;

export const SidebarLabel = styled.span`
  margin-left: 16px;
`;

export const SidebarImg = styled.img`
  width: 100px;
  margin: 0 auto;
`;

export const CloseIcon = styled.div`
  font-size: 2rem;
  cursor: pointer;
`;
