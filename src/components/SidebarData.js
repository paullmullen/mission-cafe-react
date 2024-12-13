import React from 'react';
import * as FaIcons from 'react-icons/fa';
import * as AiIcons from 'react-icons/ai';
import * as IoIcons from 'react-icons/io';

export const SidebarData = [
  {
    title: 'Recipes',
    path: 'Recipes',
    icon: <AiIcons.AiFillHome />,

  },
  {
    title: 'Reference',
    path: 'Reference',
    icon: <IoIcons.IoIosPaper />,
  
  },
  {
    title: 'Inventory',
    path: 'Inventory',
    icon: <FaIcons.FaCartPlus />
  },
  {
    title: 'Check Lists',
    path: 'Checklists',
    icon: <IoIcons.IoMdPeople />
  },
  {
    title: 'Special Events',
    path: 'Specials',
    icon: <IoIcons.IoMdPeople />
  },
  {
    title: 'Inventory',
    path: 'Inventory',
    icon: <FaIcons.FaEnvelopeOpenText />,
  },
  {
    title: 'Maintenance',
    path: 'Maintenance',
    icon: <IoIcons.IoMdHelpCircle />
  },  
  {
    title: 'Safety Log',
    path: 'SafetyLog',
    icon: <IoIcons.IoMdHelpCircle />
  },
  {
    title: 'Drawer Calculator',
    path: 'Calculator',
    icon: <IoIcons.IoMdHelpCircle />
  },
];
