import './polyfills.server.mjs';
import{a as r,b as n,s as a}from"./chunk-ND5RTJGO.mjs";var s=class t{request$=new n;requests$=this.request$.asObservable();confirm(o){return new r(e=>{this.request$.next({message:o,resolve:i=>{e.next(i),e.complete()}})})}static \u0275fac=function(e){return new(e||t)};static \u0275prov=a({token:t,factory:t.\u0275fac,providedIn:"root"})};export{s as a};
