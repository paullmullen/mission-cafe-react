import React, { useState } from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import * as FaIcons from 'react-icons/fa';
import * as AiIcons from 'react-icons/ai';
import { SidebarData } from './SidebarData';
import SubMenu from './SubMenu';
import { IconContext } from 'react-icons/lib';


const Nav = styled.div`
  background: #15171c;
  height: 80px;
  display: flex;
  justify-content: flex-start;
  align-items: center;
`;

const NavIcon = styled(Link)`
  margin-left: 2rem;
  font-size: 2rem;
  height: 80px;
  display: flex;
  justify-content: flex-start;
  align-items: center;
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
    return $sidebar ? "0" : "-100%";
  }};
  transition: 0.3s ease-in-out;
`;


const SidebarWrap = styled.div`
  width: 100%;
`;

const Sidebar = () => {
  const [sidebar, setSidebar] = useState(false);
  const showSidebar = () => {
    setSidebar(!sidebar);
  }

  return (
    <>
      <IconContext.Provider value={{ color: "#fff" }}>
        <Nav>
          <NavIcon to="#" onClick={showSidebar}>
            <FaIcons.FaBars />
          </NavIcon>
        </Nav>

        <SidebarNav $sidebar={sidebar}>
          <SidebarWrap>
            <NavIcon to="#" onClick={showSidebar}>
              <AiIcons.AiOutlineClose />
            </NavIcon>
            {SidebarData.map((item, index) => {
              return (
                <SubMenu 
                  item={item} 
                  key={index} 
                  onClick={() => setSidebar(false)} // Close the sidebar on item click
                />
              );
            })}
          </SidebarWrap>
        </SidebarNav>
      </IconContext.Provider>
    </>
  );
};

export default Sidebar;
