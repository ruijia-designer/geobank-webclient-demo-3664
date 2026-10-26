import type { Dispatch,SetStateAction } from 'react';
export type Role='admin'|'ordinary';
export type Page='overview'|'results'|'search'|'approval'|'baseline'|'admin'|'login'|'statistics';
export interface ProjectMapDetails {
 fullFoldAreaKm2?:number;
 processing?:{shotCount?:number;binSizeMeters?:[number,number];aspectRatio?:number;maxOffsetKm?:number};
 relatedProjectIds?:string[];
}
export interface Project { id:string;name:string;year:string;basin:string;type:string;area:string;point:[number,number];readable:boolean;archived:boolean;dataId?:string;typeId?:string;typePath?:string[];mapDetails?:ProjectMapDetails }
export interface SearchRecord { id:string;name:string;basin:string;areaName:string;type:string;dimension:string;year:string;archived:boolean }
export type Filters=Record<string,string[]>;
export interface SearchState { field:string;query:string;draft:string;filters:Filters;ai:boolean;summaryCollapsed:boolean;sort:'relevance'|'year' }
export interface ApprovalRecord { id:string;name:string;type:string;typeLabel:string;initiator:string;date:string;basin?:string;projectType?:string;reason?:string;note?:string;read?:boolean;status?:'passed'|'rejected' }
export interface Route { page:Page;section?:string;projectId?:string }
export interface ProjectArchiveRequest { projectId:string;projectName:string;fileCount:number;totalBytes:number;applicant:string;reason:string;submittedAt:string;status:'pending' }
export interface AppState { archiveRequests?:Record<string,ProjectArchiveRequest>;role:Role;route:Route;currentProjectId:string;projects:Project[];search:SearchState;approval:{query:string;draft:string;type:string;status:string;read:string;time:string};rightMaximized:boolean;informationMaximized:boolean;resultTab:string;panelCollapsed:boolean;colorMode:'type'|'year';overviewQuery:string;overviewFilters:Filters;selectedProjectId:string|null;mapZoom:number }
export interface AppApi { state:AppState;setState:Dispatch<SetStateAction<AppState>>;navigate:(route:Route)=>void;notify:(text:string)=>void;deny:()=>void;openProject:(project:Project)=>void }
