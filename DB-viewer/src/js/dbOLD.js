/**
 * Recursively render tree
 *
 * @param db		Database
 * @param lev		Current level
 * @param elemTree	XML-element to render into
 * @param m			Brick map
 *
 */
function renderBricksTreeR(db,lev,elemTree, m){
	for(var i=0;i<lev.length;i++){
		var etop = document.createElement("li");
		var atop = document.createElement("a");
		//console.log(lev[i])
		atop.setAttribute("href","#brick_"+lev[i].brickid);

		var elem = document.createTextNode(m[lev[i].brickid].name);
		atop.appendChild(elem);



		etop.appendChild(atop);
		elemTree.appendChild(etop);

		var elemChild = document.createElement("ul");
		if (i==0){
			elemChild.setAttribute("id","bricks");
			//	elemChild.setAttribute("class","collapsibleList");
			elemChild.setAttribute("align","left");
		}
		elemTree.appendChild(elemChild);
		renderBricksTreeR(db, lev[i].children, elemChild, m);
	}
}

/**
 * Render the tree
 */
function renderBricksTree(db){

	//Find out tree structure
	var bt = getBricksTree(db);

	//Output the tree
	var m = getBricksMap(db);
	var elemTree = document.getElementById("ptree2");
	var elemdiv = document.createElement("div");
	//elemdiv.setAttribute("align","left");
	//elemdiv.setAttribute("class","ptree2x");
	var elemChild = document.createElement("ul");

	elemChild.setAttribute("id","parts");
	//elemChild.setAttribute("class","collapsibleList");


	elemdiv.appendChild(elemChild);
	elemTree.appendChild(elemdiv);

	renderBricksTreeR(db, bt, elemChild, m);

	//CollapsibleLists.apply('true');

}

/**
 * Get a JSON map   unitID => unit
 */
function getBricksMap(db) {
	var ret={};
	pforeach(db["brick"],function(unit){
		ret[unit.id]=unit;
	});
	return ret;
}

/**
 * Get a JSON map   partID => part
 */
function getPartsMap(db) {
	var ret={};
	pforeach(db["physical_part"],function(p){
		ret[p.id]=p;
	});
	return ret;
}

/**
 * Get a JSON map   authorID => author
 */
function getAuthorMap(db) {
	var ret={};
	pforeach(db["author"],function(author){
		ret[author.id]=author;
	});
	return ret;
}




/**
 * Make scalar into an array if needed
 */
function atleast1(elem){
	if(elem==undefined)
		elem=[];
	else if(elem.length==undefined)
		elem=[elem];
	return elem;
}


/**
 * For-each over an element that can be a scalar and undefined
 */
function pforeach(elem,f){
	elem=atleast1(elem);
	for(var i=0;i<elem.length;i++)
		f(elem[i]);
}

/**
 * Get the top level bricks in the database
 */
function getTopBricks(db){
	//Make a list of referenced nodes
	var usednodes = {};
	pforeach(db["brick"],function(unit){
		pforeach(unit["function"], function(lu){
			pforeach(lu["implementation"], function(imp){
				if(imp.type=="brick")
					usednodes[imp.id]=1;
			});
		});
	});

	//Keep only nodes without references
	var hasnodes = [];
	pforeach(db["brick"],function(unit){
		if(usednodes[unit.id]!=1) {
			hasnodes.push(unit.id);
		}
	});
	return hasnodes;
}




/**
 * Get a tree of bricks. Returns LIST
 *
 * LIST := [TREE]
 * TREE := {brickid:id, children:LIST}
 */
function getBricksTree(db){


	function getBricksTreeR(m,parentid){
		var ret = {brickid:parentid, children:[]};
		pu = m[parentid];
		pforeach(pu["function"], function(lu){
			pforeach(lu["implementation"], function(imp){
				if(imp.type=="brick")
					ret.children.push(getBricksTreeR(m, imp.id));
			});
		});
		return ret;
		//TODO handle circular dependencies
	}

	var m = getBricksMap(db);
	var ret = [];
	var tb = getTopBricks(db);
	for(var i=0;i<tb.length;i++)
		ret.push(getBricksTreeR(m, tb[i]));
	return ret;
}




/**
 * Function to return count for physical item
 */
function getPhysicalPartCount(db){
	//Set all to 0
	var partcount = {};
	pforeach(db["physical_part"],function(part){
		partcount[part.id]=0;
	});

	function getPhysicalPartCountR(m,parentid){
		pu = m[parentid];
		pforeach(pu["function"], function(lu){
			pforeach(lu["implementation"], function(imp){
				if(imp.type=="physical_part"){
					var q=lu.quantity;
					if(isNaN(q))
						q="1";
					partcount[imp.id] += parseInt(q);
				} else if(imp.type=="brick") {
					getPhysicalPartCountR(m,imp.id);
				}
			});
		});
		//TODO handle circular dependencies
	}

	//Count recursively
	var m = getBricksMap(db);
	var tb = getTopBricks(db);
	for(var i=0;i<tb.length;i++)
		getPhysicalPartCountR(m, tb[i], partcount);

	return partcount;
}





/**
 * Turn XML into string
 */
function getXmlString($xmlObj){
    var xmlString="";
    $xmlObj.children().each(function(){
        xmlString+="<"+this.nodeName+">";
        if($(this).children().length>0){
            xmlString+=getXmlString($(this));
        }
        else
            xmlString+=$(this).text();
        xmlString+="</"+this.nodeName+">";
    });
    return xmlString;
}


/**
 * Extract XML from a string
 */
function string2xml(txt){
	if (window.DOMParser){
		parser=new DOMParser();
		return parser.parseFromString(txt,"text/xml");
	} else { // Internet Explorer
		xmlDoc=new ActiveXObject("Microsoft.XMLDOM");
		xmlDoc.async=false;
		xmlDoc.loadXML(txt);
		return xmlDoc;
	}
}



/**
 * Load the XML the XSLT inserted
 */
function loadxml2(){
	//think this can be done less convoluted?
	xmls = document.getElementById("hiddendata").children[0];
	xmls = new XMLSerializer().serializeToString(xmls);
	xmls = string2xml(xmls).documentElement;

	populatePage(XML2jsobj(xmls));
}


/**
 * Get the name of the project (=top brick name)
 */
function getNameOfProject(db){
	//Get name of project
	var tb = getTopBricks(db);
	for(var i=0;i<tb.length;i++){
		var b=getBricksMap(db)[tb[i]];
		return b.name;
	}
	return "";
}

/**
 *
 * The function that takes a document and populates the page with content
 *
 * @param db
 */
function populatePage(db){

	//Make the left-side tree
	renderBricksTree(db);
 //Render PerPart list
 //renderPartTree(db);

	//Set title based on the top brick name
	document.title=getNameOfProject(db);
 var link = document.createElement('link');
	$('head').append('<link href="dbfiles/dbicon.ico" rel="icon">');
	var dx=document.getElementById("ccentre");

	//Add all the bricks, in natural order
	var flatlistbricks = flattenBricksTree(db);
	var m = getBricksMap(db);
	for (var i=0; i < flatlistbricks.length; i++) {
		var thisunit=m[flatlistbricks[i]];
		addBrick(dx, thisunit, db);

		var br=document.createElement("br");
		br.setAttribute("clear","all");
		dx.appendChild(br);
		for(var o=0;o<3;o++) //must be possible to do this better
			dx.appendChild(document.createElement("br"));
	}


	addPartInstructions(dx, db);
 renderPartTree(db);
	$("#partstree span").click(function(){$("#partstree li").toggle()})

	//Add the total BOM
	addTotalBOM(dx,db);

}

/**
	* Add instructions on how to prepare components
	*/


function addPartInstructions(dx, db){
	pforeach(db["physical_part"], function(thepart){
		if(atleast1(thepart.manufacturing_instruction.step).length!=0){

			////////////////////////////////////////////////////////////////////////
			// Link here
			var anch=document.createElement("a");
			anch.setAttribute("name","physical_part_"+thepart.id);
			anch.setAttribute("class","jumpanch");
			// Title with abstract
			var h1a=document.createElement("h1");
			//h1a.appendChild(document.createTextNode("Physical part: "+thepart.description));
			h1a.appendChild(document.createTextNode(thepart.description));


			var pqja=document.createElement("p");
			pqja.setAttribute("align","left");
			pqja.appendChild(h1a);
			var qj1a=document.createElement("div");
			qj1a.setAttribute("class","project_title");
				qj1a.appendChild(anch);
			qj1a.appendChild(pqja);

			var qj1=document.createElement("div");
			qj1.appendChild(qj1a);

			dx.appendChild(qj1);
			addInstruction(dx, null, thepart.manufacturing_instruction, db);
		}
	});
}

/***
/***
/***
/***
* Part tree
**/
function renderPartTree(db){

	//Output the tree
	var elemTree = document.getElementById("ptree2");
	var elemdiv = document.createElement("div");
	var elemChild = document.createElement("ul");

	elemChild.setAttribute("id","partstree");
	//elemChild.setAttribute("class","collapsibleList");
 var pplisttxt = document.createElement("span");
	pplisttxt.innerHTML = "Physical Parts";
	elemChild.appendChild(pplisttxt);
	//CollapsibleLists.apply('true');
	pforeach(db["physical_part"],function(part){
		//console.log(part.description);
		var etop = document.createElement("li");
		var atop = document.createElement("a");
		//console.log(lev[i])
		atop.setAttribute("href","#physical_part_"+part.id);

		var elem = document.createTextNode(part.description);
		atop.appendChild(elem);
 	etop.appendChild(atop);
		elemChild.appendChild(etop);
	});

	elemdiv.appendChild(elemChild);
	elemTree.appendChild(elemdiv);

	//CollapsibleLists.applyTo(document.getElementById('parts'));
}
/***
/***
/***
/***
/***
/***

/**
 * Return a string as "" if undefined
 */
function text0(t){
	if(t!=undefined && t.length!=undefined)
		return t;
	else
		return "";
}

/**
 * Add one brick
 */
function addBrick(dx, thisunit, db){
	var nm = thisunit.name;

	////////////////////////////////////////////////////////////////////////
	// Link here
	var anch=document.createElement("a");
	anch.setAttribute("name","brick_"+thisunit.id);
anch.setAttribute("class","jumpanch");
	dx.appendChild(anch);

	////////////////////////////////////////////////////////////////////////
	// Title with abstract

	var h1a=document.createElement("h1");
	h1a.appendChild(document.createTextNode(/*"Brick: "+*/thisunit.name));

	var pqja=document.createElement("p");
	pqja.setAttribute("align","left");
	pqja.appendChild(h1a);

	var qj1a=document.createElement("div");
	qj1a.setAttribute("class","project_title");
	qj1a.appendChild(pqja);

	var qj1=document.createElement("div");
	qj1.appendChild(qj1a);

	dx.appendChild(qj1);

	thisunit.abstract=text0(thisunit["abstract"]);
	if(thisunit.abstract!=""){
		var pqjb=document.createElement("p");
		pqjb.setAttribute("align","left");
		var text=document.createTextNode(thisunit.abstract);
		pqjb.appendChild(text);
		qj1a.appendChild(pqjb);
	}
	///////////////////////////////////////////////////////////////////////
	var bdescdiv=document.createElement("div");
	thisunit.ldesc=text0(thisunit["long_description"]);

	if(thisunit.ldesc!=""){
		var ldp=document.createElement("p");
		ldp.setAttribute("class","col12 colExample");
		//ldp.setAttribute("text-align","left");
		ldp.setAttribute("style", "text-align: left");
		var ldtext=document.createTextNode(thisunit.ldesc);
		ldp.appendChild(ldtext);
		bdescdiv.appendChild(ldp);
	}
	dx.appendChild(qj1);
	dx.appendChild(bdescdiv);
	////////////////////////////////////////////////////////////////////////

	if("file" in thisunit.media && (thisunit.media.file !='undefined')){
	//console.log(thisunit.name);
	//console.log(thisunit.media);
	//console.log(thisunit);
	var brknimg=document.createElement("div");
	var brickimgsrc;

	if ("url" in thisunit.media.file){

			console.log(thisunit.name);
				brickimgsrc=thisunit.media.file.url;
				var bimg=document.createElement("img");
				bimg.setAttribute("src",brickimgsrc);
				bimg.setAttribute("width","100%");
				var brkimgp=document.createElement("p")
				brkimgp.setAttribute("class","smallimg")
				//brkimgp.setAttribute("align","left");
				brkimgp.appendChild(bimg);
				brknimg.appendChild(brkimgp);
		}
		else {
		//Gallery main IMG
		//var qj=thisstep.id.concat("ai").concat("Step-"+(1+muj).toString());
			var qj=thisunit.id.concat("brk");//.concat("Step-"+(1+muj).toString());
			var gcont=document.createElement("p");
		//gcont.setAttribute("align","left");
			var mainimg=document.createElement("div");
			mainimg.setAttribute("class","imgmain");

			brimgsrc=thisunit.media.file[0].url;
			var bimg=document.createElement("img");

			bimg.setAttribute("id",qj);
			bimg.setAttribute("src",brimgsrc);
			bimg.setAttribute("width","100%");

			mainimg.appendChild(bimg);
			gcont.appendChild(mainimg);
		///////////////////////////////////////
		var gmenu=document.createElement("div");
		gmenu.setAttribute("class","row");
		gmenu.style.marginLeft = "0px"
		gmenu.style.marginRight = "0px"

		for (var j in thisunit.media.file){
			var mu=thisunit.media.file[j].url;//.replace("img/","img/thumbs/")
			imgj=mu;
			var gimgj=document.createElement("img");
			gimgj.setAttribute("class","thumb");
			gimgj.setAttribute("src",imgj);
			gimgj.onclick = function() { var a=$(this).attr("src");
			$('#'+qj).attr("src",$(this).attr("src")); };
			gmenu.appendChild(gimgj);

			//console.log(thisstep.media.file[j].url);
//			console.log(mu);
		}
		gcont.appendChild(gmenu);
		brknimg.appendChild(gcont);
	}

dx.appendChild(brknimg);
}
//row.appendChild(stepnimg);


	////////////////////////////////////////////////////////////////////////

	var wwhow=document.createElement("div");
	wwhow.setAttribute("class","row");

	////////////////////////////////////////////////////////////////////////
	// The top what/why/how
	addsomehow(dx, thisunit, "what", "What: ");
	addsomehow(dx, thisunit, "why", "Why: ");
	addsomehow(dx, thisunit, "how", "How: ");

	///////////////////////////////////////////////////////////////////////////
	// Legal

	var anyLegal=false;

	var legalnode=document.createElement("div")
	legalnode.setAttribute("class","col12 colExample");

	//License
	thisunit.license=text0(thisunit["license"]);
	if(thisunit.license!=""){
		var p2=document.createElement("b");
		p2.appendChild(document.createTextNode("License: "));

		var p1=document.createElement("p");
		p1.setAttribute("align","left");
		p1.appendChild(p2);
		p1.appendChild(document.createTextNode(thisunit.license));
		legalnode.appendChild(p1);
		anyLegal=true;
	}


	//Authors. TODO some way to get orcid etc
	var authormap = getAuthorMap(db);
	thisunit.author=atleast1(thisunit["author"]);
	if(thisunit.author.length>0){
		var p2=document.createElement("b");
		p2.appendChild(document.createTextNode("Authors: "));
		var p1=document.createElement("p");
		p1.setAttribute("align","left");
		p1.appendChild(p2);
		legalnode.appendChild(p1);

		var firstauthor=true;
		pforeach(thisunit.author,function(authorid){
			if(!firstauthor)
				p1.appendChild(document.createTextNode(", "));
			console.log(authorid.id)

			var author=authormap[authorid.id];
			p1.appendChild(document.createTextNode(author.name + " <"+author.email+">"));
			firstauthor=false;
		});
		anyLegal=true;
	}

	//Copyright
	thisunit.copyright=text0(thisunit["copyright"]);
	//thisunit.copyright="aoeoae";
	if(thisunit.copyright!=""){
		var p2=document.createElement("b");
		p2.appendChild(document.createTextNode("Copyright: "));

		var p1=document.createElement("p");
		p1.setAttribute("align","left");
		p1.appendChild(p2);
		p1.appendChild(document.createTextNode(thisunit.copyright));
		legalnode.appendChild(p1);
		anyLegal=true;
	}

	if(anyLegal)
		dx.appendChild(legalnode);

	//////////////////////////////////////////////////////////////////////////
	//////////////////////////////////////////////////////////////////////////
	// Assembly
	if(!("assembly_instruction" in thisunit))
		thisunit.assembly_instruction={};
	addInstruction(dx, thisunit, thisunit.assembly_instruction);


	////////////////////////////////////////////////////////////////////////
	// BOM
	addBrickBOM(dx, thisunit, db);
}





/**
 * Add total bill of materials
 */
function addTotalBOM(dx, db){
	//Add new instance of BOM
	var form2 = $("#totalbomtable").get(0).cloneNode(true);
	dx.appendChild(form2);
	form2=$(form2);
	var tbody=$(form2).find("#totalbombody");

	var pcount = getPhysicalPartCount(db);

	//Add rows
	var brickmap = getBricksMap(db);
	pforeach(db["physical_part"], function(thepart){
		var row = $("#totalbomrow").get(0).cloneNode(true);
		tbody.get(0).appendChild(row);
		row=$(row);
		row.find("#quantity").html(pcount[thepart.id]);
		row.find("#description").html(thepart.description);
	});
}





/**
 * Add brick bill of materials
 */
function addBrickBOM(dx, thisbrick, db){
	//Add new instance of BOM
	var form2 = $("#brickbomtable").get(0).cloneNode(true);
	dx.appendChild(form2);
	form2=$(form2);
	var tbody=$(form2).find("#brickbombody");

	//Add rows
	var pmap = getPartsMap(db);
	var brickmap = getBricksMap(db);
	pforeach(thisbrick["function"], function(lu){
		pforeach(lu["implementation"], function(imp){
			var row = $("#brickbomrow").get(0).cloneNode(true);
			tbody.get(0).appendChild(row);
			row=$(row);
			var quantity=imp.quantity;
			if(isNaN(quantity))
				quantity="1";
			row.find("#quantity").html(quantity);

			if(imp.type=="physical_part"){

				var thepart=pmap[imp.id];
				row.find("#description").html(thepart.description);

			} else if(imp.type=="brick") {

				var thebrick = brickmap[imp.id];
				row.find("#description").html(thebrick.name);
				row.find("#description").attr("href","#brick_"+thebrick.id);

			} else
				console.log("bad imp.type "+imp.type)
		});
	});




}

/**
 * Add one set of instructions
 */
function addInstruction(dx, thisunit, instruction, db){
	instruction.step = atleast1(instruction["step"]);

	if (instruction.step.length==0){

	} else{

		//Add new instance of BOM
		var form2 = $("#instructiontable").get(0).cloneNode(true);
		dx.appendChild(form2);
		form2=$(form2);

		$(form2).find("#instructionname").html("Assembly instructions");

		for(var muj=0;muj<instruction.step.length;muj++){
			thisstep=instruction.step[muj];

			var row = $("#instructionstep").get(0).cloneNode(true);
			form2.get(0).appendChild(row);

			///////////////////////////////////////////////////
			// NOOOOOOTE: there can be more than one media file!
			// Let any additional images be thumbnails below

			var stepnimg=document.createElement("div");
			stepnimg.setAttribute("class","col6 colExample");
			var stimgsrc;



			if("media" in thisstep && "file" in thisstep.media && (thisstep.media.file !='undefined')){

				if ("url" in thisstep.media.file){
				stimgsrc=thisstep.media.file.url;
				var img=document.createElement("img");
				img.setAttribute("src",stimgsrc);
				img.setAttribute("width","100%");


				var stepimgp=document.createElement("p")
				stepimgp.setAttribute("class","smallimg")
				stepimgp.setAttribute("align","left");
				stepimgp.appendChild(img);
				stepnimg.appendChild(stepimgp);
			} else {
				//console.log(thisunit.id)
				//Gallery main IMG
				var qj=thisunit.id.concat("ai").concat("Step-"+(1+muj).toString());

				var gcont=document.createElement("p");
				gcont.setAttribute("align","left");
				var mainimg=document.createElement("div");
				mainimg.setAttribute("class","imgmain");

				stimgsrc=thisstep.media.file[0].url;
				var gimg=document.createElement("img");

				gimg.setAttribute("id",qj);
				gimg.setAttribute("src",stimgsrc);
				gimg.setAttribute("width","100%");

				mainimg.appendChild(gimg);
				gcont.appendChild(mainimg);
				///////////////////////////////////////
				var gmenu=document.createElement("div");
				gmenu.setAttribute("class","row");
				gmenu.style.marginLeft = "0px"
				gmenu.style.marginRight = "0px"

				for (var j in thisstep.media.file){
					var mu=thisstep.media.file[j].url;//.replace("img/","img/thumbs/")
					imgj=mu;

					var gimgj=document.createElement("img");
					gimgj.setAttribute("class","thumb");
					gimgj.setAttribute("src",imgj);
					gimgj.onclick = function() { var a=$(this).attr("src");
					$('#'+qj).attr("src",$(this).attr("src")); };
					gmenu.appendChild(gimgj);
					console.log(thisstep.media.file[j].url);
					console.log(mu);
				}
				gcont.appendChild(gmenu);

				stepnimg.appendChild(gcont);

			}
		}
		row.appendChild(stepnimg);
		/////////////////////////////////////////////////////


		var stepndesc=document.createElement("div");
		stepndesc.setAttribute("class","col6 colExample");
		var aidescp=document.createElement("p");
		aidescp.setAttribute("align","left");


		var aititle=document.createElement("b");
		aititle.appendChild(document.createTextNode("Step "+(1+muj)+". "));
		aidescp.appendChild(aititle);

		var aidescptxt=document.createTextNode(text0(thisstep.description));
		aidescp.appendChild(aidescptxt);
		stepndesc.appendChild(aidescp);
		row.appendChild(stepndesc);

		var br=document.createElement("br");
		br.setAttribute("clear","all");
		row.appendChild(br);
		}
	}

}


/**
 * Optionally add: Why, How, What
 */
function addsomehow(dx, thisunit, elem, head){
	if(elem in thisunit && thisunit[elem].length!=undefined){
		var qhowb=document.createElement("h1");
		qhowb.appendChild(document.createTextNode(head));

		var qhowa=document.createElement("p");
		qhowa.setAttribute("align","left");
		qhowa.appendChild(qhowb);

		var phow=document.createElement("p");
		phow.setAttribute("align","left");
		phow.appendChild(document.createTextNode(thisunit[elem]));

		var qhow=document.createElement("div");
		qhow.setAttribute("class","col4 colExample");
		qhow.appendChild(qhowa);
		dx.appendChild(qhow);

		qhow.appendChild(phow);
	}
}


/**
 * XML2jsobj v1.0
 * Converts XML to a JavaScript object
 * so it can be handled like a JSON message
 *
 * By Craig Buckler, @craigbuckler, http://optimalworks.net
 *
 * As featured on SitePoint.com:
 * http://www.sitepoint.com/xml-to-javascript-object/
 *
 * Please use as you wish at your own risk.
 */

function XML2jsobj(node) {

	var	data = {};

	// append a value
	function Add(name, value) {
		if (data[name]) {
			if (data[name].constructor != Array) {
				data[name] = [data[name]];
			}
			data[name][data[name].length] = value;
		}
		else {
			data[name] = value;
		}
	};

	// element attributes
	var c, cn;
	for (c = 0; cn = node.attributes[c]; c++) {
		Add(cn.name, cn.value);
	}

	// child elements
	for (c = 0; cn = node.childNodes[c]; c++) {
		if (cn.nodeType == 1) {
			if (cn.childNodes.length == 1 && cn.firstChild.nodeType == 3) {
				// text value
				Add(cn.nodeName, cn.firstChild.nodeValue);
			}
			else {
				// sub-object
				Add(cn.nodeName, XML2jsobj(cn));
			}
		}
	}

	return data;

}


/**
 * Return the the bricks tree as a flat list
 */
function flattenBricksTree(db){

	function flattenBricksTreeR(db,lev,list, m){
		for(var i=0;i<lev.length;i++){
			var id=lev[i].brickid;
			if($.inArray(id,lev)==-1)
				list.push(id);
			flattenBricksTreeR(db, lev[i].children, list, m);
		}
	}

	//Find out tree structure
	var bt = getBricksTree(db);

	//Output the tree
	var m = getBricksMap(db);
	var list=[];
	flattenBricksTreeR(db, bt, list, m);
	return list;
}


/**
*Update image
**/
function updateImg(prt,prt2){
	//var parent=$alert(prt)
	alert(prt+prt2);

}
