"use strict";

import {
  addStringIfNot, setClass, getData, gId, getSearchParam, setSearchParam
} from "./utils.js";

import { Tensor, matmul, AutoTokenizer, SiglipTextModel } from './transformers.min.js';


// image locations
const imgDirThm = "img/thm/";
const imgDirMed = "img/med/";


// maximum number of images to display on a search result page
const PAGE_SIZE = 24;
const MODE_APPS = ["welcome", "grid", "cluster", "image",
                   "modal", "photographer", "about", "map"];

// store constant DOM elements by ID and store global here
const btnImageNext = gId("btnImageNext");
const btImagePrevious = gId("btnImagePrevious");
const btnPaginateNext = gId("btnPaginateNext");
const btnPaginatePrevious = gId("btnPaginatePrevious");
const imgContainerImage = gId("imgContainerImage");
const imgModalImage = gId("imgModalImage");
const inputControl = gId("inputControl");
const innerContainerCluster = gId("innerContainerCluster");
const innerContainerImage = gId("innerContainerImage");
const innerContainerSearch = gId("innerContainerSearch");
const innerContainerPhotographer = gId("innerContainerPhotographer");
const innerContainerMap = gId("innerContainerMap");
const metaNara = gId("metaNara");
const metaDate = gId("metaDate");
const metaPhotographer = gId("metaPhotographer");
const metaLocation = gId("metaLocation");
const metaTitle = gId("metaTitle");
const metaCluster = gId("metaCluster");
const metaCaption = gId("metaCaption");
const metaKeywords = gId("metaKeywords");
const ulPaginate = gId("ulPaginate");
const spanSearchMessage = gId("spanSearchMessage");
const spanSearchMessageOverlay = gId("spanSearchMessageOverlay");
const searchOverlay = gId("searchOverlay");

// variable to store a pointer to the search results
let curQuery = "";
let curPage = 1;
let curPageMax = 1;
let curPid = "542495";
let curId = 0;
let curIds = [];
let curCountClust = {};
let curCountPhotographer = {};
let curCountLocation = {};
let queryString = "";
let noResultsFlag = false;
let sortOnlyFlag = false;
let okaySort = false;

const updateStateAll = function()
{
  // grab current search parameters
  const query = getSearchParam("q", "");
  const page = Number(getSearchParam("page", 1));
  const pid = getSearchParam("pid", "549112");
  let elem = getSearchParam("r", "welcome");
  let info = getSearchParam("info", "");

  // what to do with the about modal?
  const elemModalSearch = document.getElementById('elemModalSearch');
  if (info == "search") {
    elemModalSearch.classList.add('is-active');
  } else {
    elemModalSearch.classList.remove('is-active');    
  }

  // make sure that the values are valid, and update if needed
  if (!MODE_APPS.includes(elem)) { elem = "welcome"; }

  // set visibility of containers
  if (!['welcome', 'modal'].includes(elem))
  {
    setClass("elemContainerSearch", "is-hidden", elem !== "grid");
    setClass("elemPaginate", "is-hidden", elem !== "grid");
    setClass("elemContainerCluster", "is-hidden", elem !== "cluster");
    setClass("elemContainerImage", "is-hidden", elem !== "image");
    setClass("elemContainerPhotographer", "is-hidden", elem !== "photographer");
    setClass("elemContainerMap", "is-hidden", elem !== "map");

    setClass("liTabsGrid", "is-active", elem === "grid");
    setClass("liTabsCluster", "is-active", elem === "cluster");    
    setClass("liTabsPhotographer", "is-active", elem === "photographer");
    setClass("liTabsMap", "is-active", elem === "map");
  }
  setClass("elemSectionAbout", "is-hidden", elem !== "about");
  setClass("elemModalImage", "is-active", elem === "modal");
  setClass("elemSectionMain", "is-hidden", ['welcome', 'about'].includes(elem));
  setClass("elemSectionWelcome", "is-hidden", elem !== "welcome");

  if (mapObject !== null) { mapObject.invalidateSize(); }

  // update search results if needed
  if ((curQuery !== query) | (curIds.length === 0))
  {
    curQuery = query;
    curPage = 1;
    updateStateSearch(curQuery);
  }
  
  // update page if needed (already done if new search)
  if (curPage !== page)
  {
    curPage = page;
    updateStateGridPagination(curPage);
  }

  // update image page if needed
  if (curPid !== pid)
  {
    curPid = pid;
    curId = curIds.indexOf(pid);
    updateStateImage(curPid);  
  }

};

const doSearch = function (iSet, qval)
{
  const re = new RegExp("\\b" + qval);
  const searchSet = {};

  for (const [key, value] of Object.entries(iSet)) {
    if (re.test(value.tags)) { searchSet[key] = value; };
  }

  return(searchSet);
};

const splitStringQuotes = function(iString)
{
  const myRegexp = /[^\s"]+|"([^"]*)"/gi;
  const oArray = [];

  do {
      var match = myRegexp.exec(iString);
      if (match != null)
      {
          oArray.push(match[1] ? match[1] : match[0]);
      }
  } while (match != null);
  return(oArray);
};

const countClusters = function(searchSet, dRes)
{
  curCountClust = {};
  for (const [key, value] of Object.entries(dRes.cluster)) {
    curCountClust[key] = 0;
  };

  for (const [key, value] of Object.entries(searchSet)) {
    curCountClust[value.cluster] += 1;
  }
};

const countPhotographers = function(searchSet, dRes)
{
  curCountPhotographer = {};
  for (const [key, value] of Object.entries(dRes.photographer)) {
    curCountPhotographer[key] = 0;
  };

  for (const [key, value] of Object.entries(searchSet)) {
    curCountPhotographer[value.photographer] += 1;
  }
};

const countLocation = function(searchSet, dRes)
{
  curCountLocation = {};
  for (const [key, value] of Object.entries(dRes.location)) {
    curCountLocation[key] = 0;
  };

  for (const [key, value] of Object.entries(searchSet)) {
    curCountLocation[value.location] += 1;
  }
};

const updateStateSearch = function(query)
{
  dBase.then(async (dRes) => {
    inputControl.value = query;
    const querySet = splitStringQuotes(query);
    let searchSet = dRes.search;

    okaySort = false;
    gId('searchOverlay').classList.add('hidden');

    let queryStringArray = [];
    for (let j = 0; j < querySet.length; j++)
    {
      let qs = querySet[j].toLowerCase();
      qs = qs.replace('"','');
      qs = qs.replace('.','');
      if (!qs.includes(":")) { queryStringArray.push(qs) };
      searchSet = doSearch(searchSet, qs);
    }
    queryString = queryStringArray.join(" ");

    noResultsFlag = false;
    sortOnlyFlag = false;

    if (query.includes(":sort")) {
      searchSet = {};
      sortOnlyFlag = true;
    }

    if (query === "") { 
      searchSet = dRes.search;
      curIds = Object.keys(searchSet);
    } else if (Object.keys(searchSet).length > 0) {
      curIds = Object.keys(searchSet);
      await sortBySearch(queryString);   
    } else {
      noResultsFlag = true;
      searchSet = dRes.search;
      curIds = Object.keys(searchSet);
      await sortBySearch(queryString);   
    }

    curPageMax = Math.ceil(curIds.length / PAGE_SIZE);
    countClusters(searchSet, dRes);
    countPhotographers(searchSet, dRes);
    countLocation(searchSet, dRes);

    updateStateGridPagination(curPage); 
    updateStateCluster();
    updateStatePhotographer();
    //updateStateMap();
  });
};

const updateStateGridPagination = function(page)
{
  dBase.then((dRes) => {
    const nsize = curIds.length;
    const nstop = Math.min(page * PAGE_SIZE, nsize);

    // 1. add the images to the search page
    innerContainerSearch.replaceChildren();
    for (let j = (page - 1) * PAGE_SIZE; j < nstop; j++) {
      const div = document.createElement("div");
      const fig = document.createElement("figure");
      const img = document.createElement("img");

      div.addEventListener(
        "click", () => {
          setSearchParam({"r": "image", "pid": curIds[j]});
          updateStateAll();
        }
      );

      div.classList.add(...["cell", "is-clickable"]);
      fig.classList.add(...["image", "is-128x128", "m-3"]);
      img.src = imgDirThm + curIds[j] + ".jpg";

      innerContainerSearch
        .appendChild(div)
        .appendChild(fig)
        .appendChild(img);
      }

    // 2. set state of the previous and next buttons 
    if (page === 1)
    {
      btnPaginatePrevious.toggleAttribute("disabled", "disabled");
    } else {
      btnPaginatePrevious.removeAttribute("disabled");    
    }
    if (page >= curPageMax)
    {
      btnPaginateNext.toggleAttribute("disabled", "disabled");
    } else {
      btnPaginateNext.removeAttribute("disabled");    
    }

    // 3. create the pagination buttons; start with array of index values
    let larr = [];
    if (curPageMax <= 5)
    {
      larr = Array(curPageMax).fill().map((element, index) => index + 1);
    } else {
      if (page <= 3)
      {
        larr = [1, 2, 3, 4, -1, curPageMax];
      } else if (page + 2 >= curPageMax)
      {
        larr = [1, -1, curPageMax - 2,  curPageMax - 1, curPageMax];
      } else {
        larr = [1, -1, page - 1, page, page + 1, -1, curPageMax];
      }
    }

    // 4. create and append the pagination buttons
    ulPaginate.replaceChildren();
    for (let j = 0; j < larr.length; j++) {
      const li = document.createElement("li");
      const elemA = document.createElement("a");

      elemA.href = "#";
      if (larr[j] === -1)
      {
        elemA.classList.add("pagination-ellipsis");
        elemA.innerHTML = "&hellip;";
      } else {
        elemA.classList.add("pagination-link");
        elemA.innerHTML = larr[j];
        elemA.addEventListener('click', () => {
          setSearchParam({"page": larr[j]});
          updateStateAll();
        });
      }
      if (larr[j] == curPage) { elemA.classList.add("is-current"); }

      ulPaginate
        .appendChild(li)
        .appendChild(elemA);
    }

    // 5. set results message
    if (curQuery === "") {
      spanSearchMessage.innerHTML = 
        '<strong>' + String((page - 1) * PAGE_SIZE + 1) + "-" +
        String((page) * PAGE_SIZE) + "</strong> of all " +
        '<strong>' + String(curIds.length) + '</strong>' +
        ' images'; 
    } else if (curIds.length === 0) {
      spanSearchMessage.innerHTML =
        'No results found for \'<strong class="has-text-link">' +
        curQuery + '</strong>\'';      
    } else if (sortOnlyFlag) {
      spanSearchMessage.innerHTML =
        'Showing ' +
        '<strong>' + String((page - 1) * PAGE_SIZE + 1) + "-" +
        String((page) * PAGE_SIZE) + "</strong> of all " +
        'images sorted by the query \'<strong class="has-text-link">' +
        curQuery + '</strong>\'';
    } else if (noResultsFlag) {
      spanSearchMessage.innerHTML =
        '<strong>No exact matches found!</strong> Showing ' +
        '<strong>' + String((page - 1) * PAGE_SIZE + 1) + "-" +
        String((page) * PAGE_SIZE) + "</strong> of all " +
        'images sorted by the query \'<strong class="has-text-link">' +
        curQuery + '</strong>\'';

      if (!okaySort) {
        spanSearchMessageOverlay.innerHTML = 
          '\'<strong class="has-text-link">' + curQuery + '</strong>\''; 
        searchOverlay.classList.remove('hidden');    
      }

    } else if (curPageMax === 1) {
      spanSearchMessage.innerHTML =
        '<strong>' + String(curIds.length) + '</strong>' +
        ' results found for \'<strong class="has-text-link">' +
        curQuery + '</strong>\'';       
    } else {
      spanSearchMessage.innerHTML =
        '<strong>' + String((page - 1) * PAGE_SIZE + 1) + "-" +
        String((page) * PAGE_SIZE) + "</strong> of " +
        '<strong>' + String(curIds.length) + '</strong>' +
        ' results for \'<strong class="has-text-link">' +
        curQuery + '</strong>\''; 
    }
  });
};

const updateStateImage = function(pid)
{
  imgContainerImage.src = imgDirMed + pid + ".jpg";
  imgModalImage.src = imgDirMed + pid + ".jpg";

  if (curId >= 0)
  {
    if (curId !== 0)
    {
      btnImagePrevious.removeAttribute("disabled");
    } else {
      btnImagePrevious.toggleAttribute("disabled", "disabled");
    }
    if (curId !== curIds.length - 1 )
    {
      btnImageNext.removeAttribute("disabled");
    } else {
      btnImageNext.toggleAttribute("disabled", "disabled");
    }
  } else {
    btnImageNext.toggleAttribute("disabled", "disabled");
    btnImagePrevious.toggleAttribute("disabled", "disabled");
  }

  getData("data/json/" + pid + ".json").then((r) => {
    metaNara.innerHTML = r['objectId'];
    metaNara.href =
      "https://www.nga.gov/collection/art-object-page." +
      r['objectId'] + ".html";
    metaDate.innerHTML = r['date'];    
    metaPhotographer.innerHTML = r['photographer'];
    metaPhotographer.addEventListener(
      "click", () => {
        inputControl.value = "\"creator:" + r['photographer'] + "\"";
        setSearchParam({"page": 1, "q": inputControl.value, "r": "grid"});
        updateStateAll();
      }
    );
    metaLocation.innerHTML = r['location'];
    metaLocation.addEventListener(
      "click", () => {
        inputControl.value = "\"location:" + r['location'] + "\"";
        setSearchParam({"page": 1, "q": inputControl.value, "r": "grid"});
        updateStateAll();
      }
    );
    metaTitle.innerHTML = '<b>Title: </b>' + r['title'];
    metaCluster.innerHTML = r['cluster'];    
    metaCluster.addEventListener(
      "click", () => {
        inputControl.value = "cluster:" + String(r['cl']).padStart(2, '0');
        setSearchParam({"page": 1, "q": inputControl.value, "r": "grid"});
        updateStateAll();
      }
    );
    metaKeywords.replaceChildren();
    for (let j = 0; j < 10; j++)
    {
      const nLink = document.createElement("a");
      nLink.innerHTML = r['terms'][j];
      nLink.addEventListener(
        "click", () => {
          inputControl.value = r['terms'][j];
          setSearchParam({"page": 1, "q": inputControl.value, "r": "grid"});
          updateStateAll();
        }
      );
      metaKeywords.appendChild(nLink);
      if(j != 9) {
        const span = document.createElement("span");
        span.innerHTML = " &ndash; ";
        metaKeywords.appendChild(span);
      };
    }
    metaCaption.innerHTML = '<b>Caption: </b>' + r['caption'];    

    innerContainerImage.replaceChildren();
    for (let j = 0; j < 16; j++) {
      const div = document.createElement("div");
      const fig = document.createElement("figure");
      const img = document.createElement("img");

      div.addEventListener(
        "click", () => {
          setSearchParam({"r": "image", "pid": r.nn1[j]});
          updateStateAll();
        }
      );

      div.classList.add(...["cell", "is-clickable"]);
      fig.classList.add(...["image", "is-96x96", "m-2", "is-hoverable"]);
      img.src = imgDirThm + r.nn1[j] + ".jpg";

      innerContainerImage
        .appendChild(div)
        .appendChild(fig)
        .appendChild(img);

    }

    window.scrollTo(0, 0);
  });
};

const updateStateCluster = function()
{
  dBase.then((dRes) => {

    const items = Object.keys(
      curCountClust).map((key) => {
        return [key, curCountClust[key]];
      }
    );
    if (curQuery != "") {
      items.sort((first, second) => { return second[1] - first[1]; });
    }
    const keys = items.map((e) => { return e[0]; });

    innerContainerCluster.replaceChildren();
    for (let j = 0; j < keys.length; j++) {

      const key = keys[j];
      const value = dRes.cluster[key];

      if (curCountClust[key] > 0) {
        const div = document.createElement("div");
        const fig = document.createElement("figure");
        const cnt = document.createElement("span");
        const lab = document.createElement("div");
        const img = document.createElement("img");

        div.addEventListener(
          "click", () => {
            inputControl.value = addStringIfNot(
              inputControl.value,
              "cluster:" + String(key).padStart(2, '0')
            );
            setSearchParam({"page": 1, "q": inputControl.value, "r": "grid"});
            updateStateAll();
          }
        );

        div.classList.add(...["cell", "is-clickable"]);
        fig.classList.add(...["image", "is-128x128", "m-4", "mb-6"]);
        cnt.classList.add(...["is-size-7"]);
        lab.classList.add(...["image-text-center"]);
        img.classList.add(...["is-opacity-40", "has-border"]);

        img.src = imgDirThm + value.nid + ".jpg";
        img.classList.add("is-rounded");
        lab.innerHTML = "<strong>#" + key + " " + value.label + "</strong>";
        cnt.innerHTML = "<strong>" + curCountClust[key] +
          "</strong> of " + value.count + " photos";

        innerContainerCluster
          .appendChild(div)
          .appendChild(fig)
          .appendChild(img);
        fig.appendChild(lab);
        fig.appendChild(cnt);
      }
    }
  });
};

const updateStatePhotographer = function()
{
  dBase.then((dRes) => {

    const items = Object.keys(curCountPhotographer).map((key) => {
      return [key, curCountPhotographer[key]];
    });
    items.sort((first, second) => { return second[1] - first[1]; });
    const keys = items.map((e) => { return e[0]; });

    innerContainerPhotographer.replaceChildren();
    for (let j = 0; j < keys.length; j++) {

      const key = keys[j];
      const value = dRes.photographer[key];

      if (curCountPhotographer[key] > 0) {
        const div = document.createElement("div");
        const fig = document.createElement("figure");
        const cnt = document.createElement("span");
        const lab = document.createElement("span");
        const img = document.createElement("img");

        div.addEventListener(
          "click", () => {
            inputControl.value = addStringIfNot(
              inputControl.value,
              "\"creator:" + key + "\""
            );
            setSearchParam({"page": 1, "q": inputControl.value, "r": "grid"});
            updateStateAll();
          }
        );

        div.classList.add(...["cell", "is-clickable"]);
        fig.classList.add(...["image", "is-128x128", "m-4", "mb-6"]);
        cnt.classList.add(...["is-size-7"]);

        img.src = imgDirThm + value.nid + ".jpg";
        img.classList.add("is-rounded");
        lab.innerHTML = "<strong>" + value.label + "</strong>";
        cnt.innerHTML = "<strong>" + curCountPhotographer[key] +
          "</strong> of " + value.count + " photos";

        innerContainerPhotographer
          .appendChild(div)
          .appendChild(fig)
          .appendChild(lab);
        fig.appendChild(img);
        fig.appendChild(cnt);
      }
    }
  });
};

const updateStateMap = function()
{
  dBase.then((dRes) => {

    const items = Object.keys(curCountLocation).map((key) => {
      return [key, curCountLocation[key]];
    });
    items.sort((first, second) => { return second[1] - first[1]; });
    const keys = items.map((e) => { return e[0]; });

    resetMap();
    for (let j = 0; j < keys.length; j++) {
      const value = dRes.location[keys[j]];
      if (keys[j] !== "OTHER")
      {
        const cutCnt = curCountLocation[value['location']];
        if (cutCnt > 0)
        {
          const marker = L.circle(
            [value['lat'], value['lon']],
            {
              color: "#576f3e",
              weight: 1,
              fillColor: '#b3c89d',
              fillOpacity: 0.7,
              radius: 10000 * Math.sqrt(cutCnt),
              className: 'leaflet-circle-custom'
          }
          ).addTo(mapObject);

          marker.bindTooltip(
            value['location'] + ": <b>" + cutCnt.toString() + "</b>",
            {
              direction: "bottom",
              sticky: true,
              opacity: 1,
              className: 'leaflet-tooltip-custom' 
            }
          );

          marker.on("click", function(e) {
            inputControl.value = addStringIfNot(
              inputControl.value,
              "\"location:" + value['location'] + "\""
            )
            setSearchParam({"page": 1, "q": inputControl.value, "r": "grid"});
            updateStateAll();
          });
        }
      }
    }

  });
};

// const addSearchOptions = function(dRes) {
//   const datalistObj = gId("datalistObj");

//   for (let j = 0; j < dRes.opts.length; j++) { 
//     const option = document.createElement("option");
//     option.value = dRes.opts[j];
//     datalistObj.appendChild(option);
//   }
// };

// download the main dataset
const dBase = getData("data/data.json");
const dEmbed = getData("data/embed.json");
let mapObject = null;
let imageEmbed = {};
let tok = null;
let model = null;

dEmbed.then(async (embed) => {
  Object.entries(embed).forEach(([key, value]) => {
    imageEmbed[key] = new Tensor(
      'float32',
      new Float32Array(value),
      [1, 768],
    );
  });

  const tokenizer = AutoTokenizer.from_pretrained(
    'Xenova/siglip-base-patch16-224',
    {
      dtype: 'q8',
      device: 'wasm'
    },
  );
  const text_model = SiglipTextModel.from_pretrained(
    'Xenova/siglip-base-patch16-224',
    {
      dtype: 'q8',
      device: 'wasm'
    },
  );

  [tok, model] = await Promise.all([tokenizer, text_model])
});

const sortBySearch = async function(queryString) {
  if (model !== null) {
    const text_inputs = tok([queryString], {
      padding: 'max_length',
      truncation: true,
    });
    const { pooler_output } = await model(text_inputs);
    const vecText = pooler_output.normalize(2, 1);

    const logit_bias = -12.932437;
    const logit_scale = 117.330765;
    const vecTrans = vecText.squeeze().unsqueeze(1);

    let scores = [];
    for (let i = 0; i < curIds.length; i++) {
      const mat = await matmul(imageEmbed[curIds[i]], vecTrans);
      const prob = mat.mul(logit_scale).add(logit_bias).sigmoid().tolist()[0];
      scores.push(prob);
    }  

    const index = argsortRev(scores);

    let newIds = [];
    for (let i = 0; i < curIds.length; i++) {
      newIds.push(curIds[index[i]]);    
    }
    curIds = newIds;
  }
}

const argsortRev = function (array) {
  // Create an array of indices [0, 1, 2, ..., array.length - 1]
  return array
    .map((value, index) => ({ value, index })) // Map values to their indices
    .sort((a, b) => b.value - a.value) // Sort by the values
    .map(({ index }) => index); // Extract the sorted indices
};


document.addEventListener('DOMContentLoaded', () => {

  dBase.then(updateStateAll);
  //dBase.then(addSearchOptions);

  const searchLinks = [...document.getElementsByClassName('link-search')];
  for (let i = 0; i < searchLinks.length; i++) {
    searchLinks[i].addEventListener(
      "click", () => {
        setSearchParam({"r": "grid", "q": searchLinks[i].dataset.search});
        updateStateAll();
      }
    )
  }

  gId("btnCloseWelcome").addEventListener(
    "click", () => {
      setSearchParam({"r": "grid"});
      updateStateAll();
    }
  ); 

  gId("linkNavHome").addEventListener(
    "click", () => {
      setSearchParam({"r": "welcome", "q": ""});
      updateStateAll();
    }
  ); 

  gId("linkNavAbout").addEventListener(
    "click", () => {
      setSearchParam({"r": "about"});
      updateStateAll();
    }
  ); 

  gId("backgroundModalImage").addEventListener(
    "click", () => {
      setSearchParam({"r": "image"});
      updateStateAll();
    }
  ); 

  gId("btnCloseModalImage").addEventListener(
    "click", () => {
      setSearchParam({"r": "image"});
      updateStateAll();
    }
  ); 

  gId("imgContainerImage").addEventListener(
    "click", () => {
      setSearchParam({"r": "modal"});
      updateStateAll();
    }
  ); 

  gId("liTabsGrid").addEventListener(
    "click", () => {
      setSearchParam({"r": "grid"});
      updateStateAll();
    }
  ); 

  gId("liTabsCluster").addEventListener(
    "click", () => {
      setSearchParam({"r": "cluster"});
      updateStateAll();
    }
  ); 

  gId("liTabsPhotographer").addEventListener(
    "click", () => {
      setSearchParam({"r": "photographer"});
      updateStateAll();
    }
  ); 

  gId("liTabsMap").addEventListener(
    "click", () => {
      setSearchParam({"r": "map"});
      updateStateAll();
    }
  ); 

  gId("linkBackResults").addEventListener(
    "click", () => {
      setSearchParam({"r": "grid"});
      updateStateAll();
    }
  ); 

  gId("btnAboutWelcome").addEventListener(
    "click", () => {
      setSearchParam({"r": "about"});
      updateStateAll();
    }
  ); 

  inputControl.addEventListener('keypress', (res) => {
    if (event.key === "Enter") {
      setSearchParam({
        "page": 1, "r": "grid", "q": inputControl.value
      });
      updateStateAll();
    }
  });

  gId("btnClearInputControl").addEventListener(
    "click", () => {
      inputControl.value = "";
      setSearchParam({"page": 1, "q": ""});
      updateStateAll();
    }
  ); 

  btnPaginateNext.addEventListener('click', () => {
    setSearchParam({"page": curPage + 1});
    updateStateAll();
  });

  btnPaginatePrevious.addEventListener('click', () => {
    setSearchParam({"page": curPage - 1});
    updateStateAll();
  });

  btnImageNext.addEventListener(
    "click", () => {
      setSearchParam({"pid": curIds[curId + 1]});
      updateStateAll();
    }
  );

  btnImagePrevious.addEventListener(
    "click", () => {
      setSearchParam({"pid": curIds[curId - 1]});
      updateStateAll();
    }
  );

  gId("openSearchModal").addEventListener(
    "click", () => {
      setSearchParam({"r": "about"});
      updateStateAll();
      const url = location.href;
      location.href = "#searchai";                
      //history.replaceState(null, null, url);
    }
  ); 

  gId("link-about").addEventListener(
    "click", () => {
      setSearchParam({"r": "about"});
      updateStateAll();
      const url = location.href;
      location.href = "#clusters";                
      //history.replaceState(null, null, url);
    }
  ); 

  gId("aiGeneratedMetadataButton").addEventListener(
    "click", () => {
      setSearchParam({"r": "about"});
      updateStateAll();
      const url = location.href;
      location.href = "#searchai";                
      //history.replaceState(null, null, url);
    }
  ); 

  gId("backgroundModalContent").addEventListener(
    "click", () => {
      setSearchParam({"info": ""});
      updateStateAll();
    }
  ); 

  gId("btnCloseModalSearch").addEventListener(
    "click", () => {
      setSearchParam({"info": ""});
      updateStateAll();
    }
  ); 

  gId("btnCloseModalSearch2").addEventListener(
    "click", () => {
      setSearchParam({"info": ""});
      updateStateAll();
    }
  ); 


  gId("btnCloseModalSearchAbout").addEventListener(
    "click", () => {
      setSearchParam({"info": "", "r": "about"});
      updateStateAll();
    }
  ); 

  gId("btnSortSearchClear").addEventListener(
    "click", () => {
      inputControl.value = "";
      setSearchParam({"page": 1, "q": ""});
      updateStateAll();
    }
  );

  gId("btnSortSearch").addEventListener(
    "click", () => {
      searchOverlay.classList.add('hidden');
      okaySort = true;
    }
  ); 

  gId("btnSortSearchInfo").addEventListener(
    "click", () => {
      setSearchParam({"r": "about"});
      updateStateAll();
      const url = location.href;
      location.href = "#searchai";                
    }
  ); 

  const $navbarBurgers = Array.prototype.slice.call(
    document.querySelectorAll('.navbar-burger'), 0
  );

  $navbarBurgers.forEach( el => {
    el.addEventListener('click', () => {
      const target = el.dataset.target;
      const $target = gId(target);
      el.classList.toggle('is-active');
      $target.classList.toggle('is-active');
    });
  });

  window.addEventListener('popstate', function(event) {
    updateStateAll();
  });

});

const resetMap = function() {
  if (mapObject !== null) { mapObject.remove(); }

  mapObject = L.map('map').setView(
    [35.5, -95.41508215962735],
    4
  );

  L.tileLayer('cache/{z}/{x}/{y}.png', {
      maxZoom: 7,
      attribution: ''
  }).addTo(mapObject);
};