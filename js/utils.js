"use strict";

const setClass = function(elementId, className, addFlag = true)
{
  const elem = document.getElementById(elementId);
  if (addFlag)
  {
    elem.classList.add(className);
  } else {
    elem.classList.remove(className);
  }
};

const getData = async function(path) {
  try {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }
    const json = await response.json();
    return json;
  } catch (error) {
    console.error(error.message);
  }
};

const gId = function(id)
{
  return document.getElementById(id);  
};

const getSearchParam = function(name, def = "") {
  const url = new URL(window.location);
  let np = url.searchParams.get(name);
  if (np == null) { np = def; }
  return np;
};

const setSearchParam = function(nvpair) {
  const url = new URL(window.location);

  for (const [key, value] of Object.entries(nvpair)) {
    url.searchParams.set(key, value);
  }

  history.pushState(null, '', url);
};

const addStringIfNot = function(strVal, toAdd) {
  const re = new RegExp(toAdd);
  if (!re.test(strVal)) { strVal += " " + toAdd; } ;  
  return strVal;
};

export {
  addStringIfNot, setClass, getData, gId, getSearchParam, setSearchParam
}; 
