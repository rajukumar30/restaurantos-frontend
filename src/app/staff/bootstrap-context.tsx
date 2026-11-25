"use client";
import {createContext,useContext} from "react";
export type StaffBootstrap={
 token:string;tenantId:string;branches:{id:string;name:string}[];
 access:{roles:string[];permissions:string[]};
};
export const StaffBootstrapContext=createContext<StaffBootstrap|null>(null);
export function useStaffBootstrap(){return useContext(StaffBootstrapContext);}
