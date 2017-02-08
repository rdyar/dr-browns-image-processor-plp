// (c) Copyright 2008.  Adobe Systems, Incorporated.  All rights reserved.

/*
@@@BUILDINFO@@@ Dr. Brown's Services.jsx 2.3.1
*/

/*
@@@START_XML@@@
<?xml version="1.0" encoding="UTF-8"?>
<ScriptInfo xmlns:dc="http://purl.org/dc/elements/1.1/" xml:lang="en_US">
     <dc:title>Dr. Brown's Services</dc:title>
     <dc:description>This script enables a great set of tools from the one and only, Dr. Brown.</dc:description>
</ScriptInfo>
@@@END_XML@@@
*/

// written by Tom Ruark and X Bytor
// directed by Russell Preston Brown
// 01/05/2011 1:20

// debug level: 0-2 (0:disable, 1:break on error, 2:break at beginning)
// $.level = 0;
// debugger; // launch debugger on next line


//=================================================================
// Setup/Support
// This first portion of the script sets up an object to provide
// scope for all Dr. Brown BridgeTalk related routines to prevent
// name collision with other groups' scripts, defines some common
// utility functions, and adds some Dr. Brown related commands
// to the Bridge menus.
//=================================================================


try { // Overall try catch

	var drbrownserv = new Object;

	drbrownserv.version = "2.3.1";

	drbrownserv.menuItemInfoArray = new Array ();

	//-----------------------------------------------------------------
	// This routine sets the argument menu node to be enabled.
	//-----------------------------------------------------------------
	drbrownserv.alwaysEnabled = function () {
		this.enabled = true;
	}

	// some utility routines and properties

	// given a file name and a list of extensions
	// determine if this file is in the list of extensions
	drbrownserv.isFileOneOfThese = function ( inFileName, inArrayOfFileExtensions ) {
		var lastDot = inFileName.toString().lastIndexOf( "." );
		if ( lastDot == -1 ) {
			return false;
		}
		var strLength = inFileName.toString().length;
		var extension = inFileName.toString().substr( lastDot + 1, strLength - lastDot );
		extension = extension.toLowerCase();
		for (var i = 0; i < inArrayOfFileExtensions.length; i++ ) {
			if ( extension == inArrayOfFileExtensions[i] ) {
				return true;
			}
		}
		return false;
	}
	
	// fix it so we can save jpeg and cr files to jpeg without dialogs
	drbrownserv.saveFile = function( doc, jpegQ ) {
		if ( drbrownserv.isFileOneOfThese( doc.fullName, [ "jpg", "jpeg" ] ) ) {
			doc.saveAs( doc.fullName, jpegQ );
			doc.close(SaveOptions.DONOTSAVECHANGES);
		} else { 
			if ( drbrownserv.isFileOneOfThese( doc.fullName, drbrownserv.filesForCameraRaw ) ) {
				var fileToDelete = doc.fullName;
				
				// get the file without the path
				var strFileFullName = doc.fullName.toString();
				var lastDot = strFileFullName.lastIndexOf( "." );
				if ( lastDot == -1 ) {
					lastDot = strFileFullName.length;
				}
				var fullPathNoExtension = strFileFullName.substr( 0, lastDot );
				var newFile = File( fullPathNoExtension + ".jpg" );

				var newFileArray = drbrownserv.findNewHomeForFiles( [newFile], false, false, false, false); // files array, autoMode, makeFolder, bwMode, makeCopy

				doc.saveAs( newFileArray[ 0 ], jpegQ );
				doc.close(SaveOptions.DONOTSAVECHANGES);

				fileToDelete.remove(); 
			} else {
				doc.save();
				doc.close(SaveOptions.DONOTSAVECHANGES);
			}
		}
	}

	// ubber routine that should be broken up
	drbrownserv.findNewHomeForFiles = function( infiles, autoMode, makeFolder, bwMode, makeCopy ) {
		var outfiles = new Array();
		try {
			for (var i = 0; i < infiles.length; i++) {
				var destFolder = infiles[i].parent.toString();
				if (makeFolder) {
					if (bwMode) {
						destFolder += "/Black-n-White";
					} else {
						if (autoMode) {
							destFolder += "/Auto Corrected";
						} else {
							destFolder += "/Manual Corrected";
						}
					}
					if (!Folder(destFolder).exist) {
						Folder(destFolder).create();
					}
				}
				var fileName = infiles[i].fullName.toString();
				var lastDot = fileName.lastIndexOf( "." );
				if (lastDot == -1) {
					lastDot = fileName.length;
				}
				fileName = fileName.substr( 0, lastDot );
				var lastSlash = fileName.lastIndexOf( "/" );
				fileName = fileName.substr( lastSlash + 1, fileName.length );
				var extension = infiles[i].fullName.toString().substr( lastDot, infiles[i].fullName.toString().length);
				fileName = fileName.replace(/[:\/\\*\?\"\<\>\|]/g, "_");  // '/\:*?"<>|' -> '_'
				var uniqueFileName = destFolder + "/" + fileName + extension;
				var fileNumber = 1;
				while (File(uniqueFileName).exists) {
					uniqueFileName = destFolder + "/" + fileName + "_" + fileNumber + extension;
					fileNumber++;
				}
				outfiles.push(File(uniqueFileName));

				if (makeCopy) {
					infiles[i].copy(uniqueFileName);
				}

				//// don't mess with the metadata
				//var tn = new Thumbnail(File(uniqueFileName));
				//var m = tn.metadata;
				//m.namespace = "http://ns.adobe.com/xap/1.0/";
				//m.Label = "Red";
				//// end don't mess with the metadata
				// drbrownserv.alert('a');
			}
		}
		catch(error) {
			// debugging only drbrownserv.alert(error + ":" + error.line);
		}
		return outfiles;
	}

	// A list of camera raw extensions, keep them lower case, plus jpeg
	drbrownserv.filesForCameraRaw = Array( "tif", "crw", "nef", "raf", "orf", "mrw", "dcr", "mos", "srf", "pef", "dcr", "cr2", "dng", "erf", "x3f", "raw" );


	//=================================================================
	// CaptionMaker
	// Sets up Dr. Brown's Caption Maker JavaScript to be
	// accessed from the Bridge.
	//=================================================================

	//-----------------------------------------------------------------
	// This routine takes an array of files. If called by Photoshop,
	// it will invoke Dr. Brown's Caption Maker with the files. If called by
	// any other app, it will send a BridgeTalk message to Photoshop
	// to invoke this routine with the same arguments.
	//-----------------------------------------------------------------
 	drbrownserv.captionmaker = function (files) {
 		try {
 			if (BridgeTalk.appName != "photoshop") {
 				// Bring Photoshop to the foreground.
 				BridgeTalk.bringToFront ("photoshop");
 		
 				// Create a new BridgeTalk message for Photoshop to invoke
 				// Image Processor with the selected files
 				var btMessage = new BridgeTalk;
 				btMessage.target = "photoshop";
 				btMessage.body = "drbrownserv.captionmaker (" + files.toSource () + ");";
 				btMessage.send ();
 			} else {
 		
 				// Dr. Brown's Caption Maker script will recognize this and use it
 				var gFilesFromBridge = files;
 		
 				var strPresets = localize ("$$$/ApplicationPresetsFolder/Presets=Presets");
 				var strScripts = localize ("$$$/PSBI/Automate/ImageProcessor/Photoshop/Scripts=Scripts");
 				var strCaptionMaker = "Dr. Brown's Caption Maker.jsx";
 				
 				var cmFile = new File (app.path + "/" + strPresets + "/" + strScripts + "/" + strCaptionMaker);
 				
 				var rememberDialogModes = displayDialogs;
 				displayDialogs = DialogModes.ALL;
 						
 				if (cmFile.exists) {
 					if (cmFile.open ('r')) {
 						var script = cmFile.read ();
 						cmFile.close ();
 						eval (script);
 					} else {
 						drbrownserv.alert ( strCaptionMaker + " could not be opened." );
 					}
 				} else {
 					drbrownserv.alert ( cmFile.fsName + " could not be found." );
 				}
 		
 				displayDialogs = rememberDialogModes;
 			}
 		}
 		catch (error) {
 			if (error.number != 8007) // Don't report user cancelled errors.
 				drbrownserv.alert (error);
 		}
	}


	//-----------------------------------------------------------------
	// This routine is called when the Bridge's Dr. Brown's Caption Maker
	// menu item is chosen.
	//-----------------------------------------------------------------
 	drbrownserv.captionmakerFromBridge = function () {
 		try {
 			var files = photoshop.getBridgeFileListForAutomateCommand (false);
 			
 			if (files.length != 0)
 				drbrownserv.captionmaker (files);
 		}
 		catch (error) {
 			if (error.number != 8007) // Don't report user cancelled errors.
 				drbrownserv.alert (error);
 		}
 	}


	//=================================================================
	// Process123
	// Sets up Dr. Brown's Process 1-2-3 JavaScript to be
	// accessed from the Bridge.
	//=================================================================

	//-----------------------------------------------------------------
	// This routine takes an array of files. If called by Photoshop,
	// it will invoke Dr. Brown's Process 1-2-3 with the files. If called by
	// any other app, it will send a BridgeTalk message to Photoshop
	// to invoke this routine with the same arguments.
	//-----------------------------------------------------------------
	drbrownserv.process123 = function (files) {
		try {
			if (BridgeTalk.appName != "photoshop") {
				// Bring Photoshop to the foreground.
				BridgeTalk.bringToFront ("photoshop");
		
				// Create a new BridgeTalk message for Photoshop to invoke
				// Image Processor with the selected files
				var btMessage = new BridgeTalk;
				btMessage.target = "photoshop";
				btMessage.body = "drbrownserv.process123 (" + files.toSource () + ");";
				btMessage.send ();
			} else {
		
    photoshop.runActionCommand ('611736f0-9c46-11e0-aa82-0800200c9a66', files);
      }
		}
		catch (error) {
			if (error.number != 8007) // Don't report user cancelled errors.
				drbrownserv.alert (error);
		}
	}


	//-----------------------------------------------------------------
	// This routine is called when the Bridge's Dr. Brown's Caption Maker
	// menu item is chosen.
	//-----------------------------------------------------------------
	drbrownserv.process123FromBridge = function () {
		try {
			var files = photoshop.getBridgeFileListForAutomateCommand (false);
			
			if (files.length != 0)
				drbrownserv.process123 (files);
		}
		catch (error) {
			if (error.number != 8007) // Don't report user cancelled errors.
				drbrownserv.alert (error);
		}
	}


	//-----------------------------------------------------------------
	// This routine takes an array of files. If called by Photoshop,
	// it will invoke the merge routine with the files. If called by
	// any other app, it will send a BridgeTalk message to Photoshop
	// to invoke this routine with the same arguments.
	//-----------------------------------------------------------------
	drbrownserv.drBrownsStackAMatic = function (/* Array */ files) {
		try {
			if (BridgeTalk.appName != "photoshop") {
				// Bring Photoshop to the foreground.
				BridgeTalk.bringToFront ("photoshop");
			
				// Create a new BridgeTalk message for Photoshop to invoke
				// this command on the other side of the else with the selected files
				var btMessage = new BridgeTalk;
				btMessage.target = "photoshop";
				btMessage.body = "drbrownserv.drBrownsStackAMatic (" + files.toSource () + ");";
				btMessage.send();

			} else { // below is running in Photoshop

				if ( files == undefined ) return;
				if ( files.length == undefined ) return;
				if ( files.length == 0 ) return;
				
				var dialogOK = false;
				
				var stackInfo = new Object();
				stackInfo.rbCreateStack = true;
                 // stackInfo.rbCreateLayers = false;
				stackInfo.ddStackModeIndex = 0;
				stackInfo.ddBlendModeIndex = 0;
				stackInfo.ddStackModeText = "None";
				stackInfo.ddBlendModeText = "Normal";
				stackInfo.cbAutoAlign = false;
				stackInfo.cb16bitOrMask = false;
                 stackInfo.rbMaskReveals = true;
				var stackArrayEnum = [ "entr", "kurt", "maxx", "avrg", "medn", "minn", "rang", "skew", "stdv", "summ", "vari" ];
				
                 var dlgResource = "dialog { orientation: 'row', alignChildren: 'top', alignment: 'fill', text: 'cantdoit', \
                    grpText: Group { orientation: 'column', alignChildren: 'left', \
                     grpOne: Group { orientation: 'row', \
                      icnOne: Image { icon: 'Step1Icon', helpTip: 'Select stacking method' }, \
                      stOne: StaticText { text: 'Select stacking method' }, \
                     }, \
                     grpOneD: Group { orientation: 'column', alignChildren: 'left', margins: [ 30, 0, 0, 0], \
					 rbCreateStack: RadioButton { text: 'Create Smart Object Stack', properties: { idString: 'rbCreateStack' } }, \
                      rbCreateLayers: RadioButton { text: 'Create Layers', properties: { idString: 'rbCreateLayers' } }, \
                     }, \
                     line1: Panel { bounds: [ 0, 0, 250, 0], properties: { borderStyle: 'sunken' } }, \
                     grpTwo: Group { orientation: 'row', \
                      icnTwo: Image { icon: 'Step2Icon', helpTip: 'Select settings' }, \
                      stTwo: StaticText { text: 'Select settings' }, \
                     }, \
                     grpMode: Group { orientation: 'stack', alignment: 'top', margins: [ 30, 0, 0, 0], \
                      pnlStackMode: Panel { text: 'Set Stack Mode:', properties: { idString: 'pnlStackMode' } \
					  ddStackMode: DropDownList { properties: { idString: 'ddStackMode', items: [ 'None', '-', 'Entropy', 'Kurtosis', 'Maximum', 'Mean', 'Median', 'Minimum', 'Range', 'Skewness', 'Standard Deviation', 'Summation', 'Variance' ] } }, \
					 }, \
					 pnlBlendMode: Panel { text: 'Set Blend Mode:', properties: { idString: 'pnlBlendMode' } \
					  ddBlendMode: DropDownList { properties: { idString: 'ddBlendMode', items: [ 'Normal', 'Dissolve', '-', 'Darken', 'Multiply', 'Color Burn', 'Linear Burn', 'Darker Color', '-', 'Lighten', 'Screen', 'Color Dodge', 'Linear Dodge (Add)', 'Lighter Color', '-', 'Overlay', 'Soft Light', 'Hard Light', 'Vivid Light', 'Linear Light', 'Pin Light', 'Hard Mix', '-', 'Difference', 'Exclusion', 'Subtract', 'Divide', '-', 'Hue', 'Saturation', 'Color', 'Luminosity' ] } }, \
					 }, \
                     }, \
                     grpBottom: Group { orientation: 'column', alignment: 'left', alignChildren: 'left', margins: [ 30, 0, 0, 0], \
                      cbAutoAlign: Checkbox { text: 'Auto Align', margins: [ 0, 0, 0, 0], properties: { idString: 'cbAutoAlign' } }, \
					 cb16bitOrMask: Checkbox { text: 'Add layer mask to each layer', margins: [ 0, 0, 0, 0], properties: { idString: 'cb16bitOrMask' } }, \
                      grpMoveOver: Group { orientation: 'column', alignChildren: 'left', margins: [ 15, 0, 0, 0], \
                       rbMaskReveals: RadioButton { text: 'Mask reveals layer', properties: { idString: 'rbMaskReveals' } }, \
                       rbMaskHides: RadioButton { text: 'Mask hides layer', properties: { idString: 'rbMaskHides' } }, \
                      }, \
                     }, \
                    }, \
				   grpButtons: Group { orientation: 'column', alignment: 'top', \
					btnOK: Button { text: 'OK', properties: { idString: 'btnOK' } }, \
					btnCancel: Button { text: 'Cancel', properties: { idString: 'btnCancel' } }, \
				   }, \
				}"; // end of dialog resource



					var idOK = 1;			
					var idCancel = 2;			

					var dlg = new Window( dlgResource );					

					dlg.text = "Dr. Brown's Stack-A-Matic";

					drbrownserv.flattenDialog( dlg, dlg );

					// set the defaults
					dlg.rbCreateStack.value = stackInfo.rbCreateStack;
                     dlg.rbCreateLayers.value = ! stackInfo.rbCreateStack
					dlg.ddStackMode.items[ stackInfo.ddStackModeIndex ].selected = true;
					dlg.ddBlendMode.items[ stackInfo.ddBlendModeIndex ].selected = true;
					dlg.cbAutoAlign.value = stackInfo.cbAutoAlign;
					dlg.cb16bitOrMask.value = stackInfo.cb16bitOrMask;
                     dlg.rbMaskReveals.value = stackInfo.rbMaskReveals;
                     dlg.rbMaskHides.value = ! dlg.rbMaskReveals.value;
				
					// look for last used params via Photoshop registry, getCustomOptions will throw if none exist
					try {
						var d = app.getCustomOptions( "8066830d-fc1f-4527-be0e-7830e1ecffd0" );
						drbrownserv.descriptorToObject( stackInfo, d );
						dlg.rbCreateStack.value = stackInfo.rbCreateStack;
						dlg.ddStackMode.items[ stackInfo.ddStackModeIndex ].selected = true;
						dlg.ddBlendMode.items[ stackInfo.ddBlendModeIndex ].selected = true;
						dlg.cbAutoAlign.value = stackInfo.cbAutoAlign;
						dlg.cb16bitOrMask.value = stackInfo.cb16bitOrMask;
                         dlg.rbMaskReveals.value = stackInfo.rbMaskReveals;
                         dlg.rbMaskHides.value = ! dlg.rbMaskReveals.value;
						d = null;
					}
					catch( e ) {
						// it's ok if we don't have any options, continue with defaults
					}

                     // these options are checked for each run and stored params are overwritten here
                     stackInfo.showThisOnce = false;
				    stackInfo.runningExtended = app.featureEnabled("photoshop/extended");

					dlg.rbCreateStack.onClick = function( ) {
                         dlg.grpText.grpMode.pnlStackMode.visible = this.value;
                         dlg.grpText.grpMode.pnlBlendMode.visible = ! this.value;
                         dlg.cb16bitOrMask.text = 'Force 16 bit/channel mode';
                         dlg.grpText.grpBottom.grpMoveOver.visible = ! this.value;
					}

					dlg.rbCreateLayers.onClick = function( ) {
                         dlg.grpText.grpMode.pnlStackMode.visible = ! this.value;
                         dlg.grpText.grpMode.pnlBlendMode.visible = this.value;
                         dlg.cb16bitOrMask.text = 'Add layer mask to each layer';
                         dlg.grpText.grpBottom.grpMoveOver.visible = this.value;
                         dlg.grpText.grpBottom.grpMoveOver.rbMaskReveals.enabled = dlg.cb16bitOrMask.value;
                         dlg.grpText.grpBottom.grpMoveOver.rbMaskHides.enabled = dlg.cb16bitOrMask.value;
					}
                
                     dlg.cb16bitOrMask.onClick = function( ) {
                         dlg.grpText.grpBottom.grpMoveOver.rbMaskReveals.enabled = this.value;
                         dlg.grpText.grpBottom.grpMoveOver.rbMaskHides.enabled = this.value;
                     }

                     if ( ! stackInfo.runningExtended ) {
                        dlg.grpText.grpMode.pnlStackMode.ddStackMode.selection = 0;
                        dlg.grpText.grpMode.pnlStackMode.ddStackMode.onChange = function( ) {
                            if ( ! stackInfo.showThisOnce ) {
                                alert('You must be running Photoshop Extended to use Stack Mode!');
                                stackInfo.showThisOnce = true;
                            }
                            this.selection = 0;
                        }
                     }

                     // smash the last used otherwise we have truncation
                     dlg.rbCreateLayers.value = true;
                     
                     dlg.rbCreateLayers.onClick();
                     dlg.cb16bitOrMask.onClick();
				
					dlg.center();
					
					dialogOK = idOK == dlg.show();

					// save off parameters
					if ( dialogOK ) {
						stackInfo.rbCreateStack = dlg.rbCreateStack.value;
						stackInfo.ddStackModeIndex = dlg.ddStackMode.selection.index;
						stackInfo.ddBlendModeIndex = dlg.ddBlendMode.selection.index;
						stackInfo.ddStackModeText = dlg.ddStackMode.selection.text;
                         stackInfo.ddBlendModeText = dlg.ddBlendMode.selection.text;
						stackInfo.cbAutoAlign = dlg.cbAutoAlign.value;
						stackInfo.cb16bitOrMask = dlg.cb16bitOrMask.value;
                         stackInfo.rbMaskReveals = dlg.rbMaskReveals.value;
					}
				
					var d = drbrownserv.objectToDescriptor( stackInfo );
					d.putString( app.charIDToTypeID( 'Msge' ), "Dr. Brown's Stack-A-Matic options" );
					app.putCustomOptions( "8066830d-fc1f-4527-be0e-7830e1ecffd0", d );
					d = null;


                 if ( dialogOK ) {

					var	firstDoc = open( files[ 0 ] );
				
					var targetDoc = firstDoc.duplicate();
					
					var bottomLayer = targetDoc.activeLayer;
                    
                     bottomLayer.isBackgroundLayer = false;
                     
                     var docSplit = files[ 0 ].toString().split( "/" );

					var fileName = docSplit[ docSplit.length - 1 ];

                     bottomLayer.name = decodeURI( fileName );
                     
					firstDoc.close( SaveOptions.DONOTSAVECHANGES );

					for ( var i = 1; i < files.length; i++ ) {
						try {
							var newDoc = open( files[ i ] );

							newDoc.selection.selectAll();

							newDoc.selection.copy();

							docSplit = files[ i ].toString().split( "/" );

							fileName = docSplit[ docSplit.length - 1 ];

							activeDocument = targetDoc;

							targetDoc.paste();

							targetDoc.activeLayer.name = decodeURI( fileName );
                            
							newDoc.close( SaveOptions.DONOTSAVECHANGES );

						}
						
						catch(e) {
							// drbrownserv.alert( "ERROR DrBrownsStackAMatic: " + e );
						}
					} // end the for loop for adding in the layers
				
					if ( stackInfo.rbCreateStack ) {
						
                        if ( stackInfo.cb16bitOrMask ) {
                            app.activeDocument.bitsPerChannel = BitsPerChannelType.SIXTEEN;
                        }
				
						drbrownserv.selectAdditionalLayer( bottomLayer.name );
							
						if ( stackInfo.cbAutoAlign ) {
							var alignID = charIDToTypeID( "Algn" );
							var alignDesc = new ActionDescriptor();
							var nullID = charIDToTypeID( "null" );
							var alignRef = new ActionReference();
							alignRef.putEnumerated( charIDToTypeID( "Lyr " ), charIDToTypeID( "Ordn" ), charIDToTypeID( "Trgt" ) );
							alignDesc.putReference( nullID, alignRef );
							alignDesc.putEnumerated( charIDToTypeID( "Usng" ), charIDToTypeID( "ADSt" ), stringIDToTypeID( "ADSContent" ) );
							alignDesc.putEnumerated( charIDToTypeID( "Aply" ), stringIDToTypeID( "projection" ), charIDToTypeID( "Auto" ) );
							executeAction( alignID, alignDesc, DialogModes.NO );
						}

						executeAction( stringIDToTypeID( "newPlacedLayer" ), undefined, DialogModes.NO );
						
						
						if ( stackInfo.runningExtended && stackInfo.ddStackModeIndex != 0 ) { // None is index 0
							var isdesc4 = new ActionDescriptor();
							var isid21 = stringIDToTypeID( "imageStackPlugin" );
							var isid22 = charIDToTypeID( stackArrayEnum[ stackInfo.ddStackModeIndex - 2 ] );
							isdesc4.putClass( isid21, isid22 );
							var isid23 = charIDToTypeID( "Nm  " );
							isdesc4.putString( isid23, stackInfo.ddStackModeText );
							executeAction( stringIDToTypeID( "applyImageStackPluginRenderer" ), isdesc4, DialogModes.NO );
						}

					} // end create stack option
                    else 
                    { // start create layers

                         drbrownserv.selectAdditionalLayer( bottomLayer.name );
                                
                        if ( stackInfo.cbAutoAlign ) {
                            var alignID = charIDToTypeID( "Algn" );
                            var alignDesc = new ActionDescriptor();
                            var nullID = charIDToTypeID( "null" );
                            var alignRef = new ActionReference();
                            alignRef.putEnumerated( charIDToTypeID( "Lyr " ), charIDToTypeID( "Ordn" ), charIDToTypeID( "Trgt" ) );
                            alignDesc.putReference( nullID, alignRef );
                            alignDesc.putEnumerated( charIDToTypeID( "Usng" ), charIDToTypeID( "ADSt" ), stringIDToTypeID( "ADSContent" ) );
                            alignDesc.putEnumerated( charIDToTypeID( "Aply" ), stringIDToTypeID( "projection" ), charIDToTypeID( "Auto" ) );
                            executeAction( alignID, alignDesc, DialogModes.NO );
                        }

                    } // end if ( stackInfo.rbCreateStack )
					
					// deselect them all first
					// if you select a layer that is already in a multi selection then
					// it is typcically not what you want, we need one and only one selected
					for ( var i =0; i < targetDoc.artLayers.length; i++ ) {
						drbrownserv.unselectAdditionalLayer( targetDoc.artLayers[i].name );
					}
					
					// must loop again to add the mask as 
					// doing it before the align will cause nothing to get aligned
					for ( var i = 0; i < targetDoc.artLayers.length; i++ ) {
					 
						if ( ! stackInfo.rbCreateStack ) {
                                 
							targetDoc.activeLayer = targetDoc.artLayers[i];
							
							if ( stackInfo.ddBlendModeText != "Normal" ) {
                                targetDoc.activeLayer.blendMode = drbrownserv.textToBlendMode( stackInfo.ddBlendModeText );
                            }
                                 
                            drbrownserv.addMaskAsNeeded( stackInfo.cb16bitOrMask, stackInfo.rbMaskReveals );

                        }
					}

				
				} // end the if dialog ok
			} // end if ! photoshop and else 
		} // end try block for drBrownsStackAMatic
		
		catch (error) {
			if (error.number != 8007) // Don't report user cancelled errors.
				drbrownserv.alert (error + ":" + error.line);
		}
	} // end function drBrownsStackAMatic


	//-----------------------------------------------------------------
	// This routine is called when the Dr. Browns Stack a matic menu
	// item is chosen.
	//-----------------------------------------------------------------
	drbrownserv.drBrownsStackAMaticFromBridge = function () {
		try {
			var files = photoshop.getBridgeFileListForAutomateCommand (false);
			
			if (files.length != 0)
				drbrownserv.drBrownsStackAMatic (files);
		}
		
		catch (error) {
			if (error.number != 8007) // Don't report user cancelled errors.
				drbrownserv.alert (error); //  + ":" + error.line);
		}
	}


    //-----------------------------------------------------------------
	// This routine is called when the Dr. Browns stack a matic menu
	// item is chosen.
	//-----------------------------------------------------------------
	drbrownserv.drBrownsMergeAMaticFromBridge = function () {
		try {
			var files = photoshop.getBridgeFileListForAutomateCommand (false);
			
			if (files.length != 0)
				drbrownserv.drBrownsMergeAMatic (files);
		}
		
		catch (error) {
			if (error.number != 8007) // Don't report user cancelled errors.
				drbrownserv.alert (error); //  + ":" + error.line);
		}
	}


	//-----------------------------------------------------------------
	// This routine takes an array of files. If called by Photoshop,
	// it will invoke the star show routine with the files. If called by
	// any other app, it will send a BridgeTalk message to Photoshop
	// to invoke this routine with the same arguments.
	//-----------------------------------------------------------------
	drbrownserv.drBrownsStarShow = function (/* Array */ files) {
		try {
			if (BridgeTalk.appName != "photoshop") {
				// Bring Photoshop to the foreground.
				BridgeTalk.bringToFront ("photoshop");
			
				// Create a new BridgeTalk message for Photoshop to invoke
				// this command on the other side of the else with the selected files
				var btMessage = new BridgeTalk;
				btMessage.target = "photoshop";
				btMessage.body = "drbrownserv.drBrownsStarShow (" + files.toSource () + ");";
				btMessage.send();

			} else {

				if ( files == undefined ) return;
				if ( files.length == undefined ) return;
				if ( files.length == 0 ) return;
                
				var starInfo = new Object();
				starInfo.etName = 'Time Lapse Assistant';
				starInfo.etTransition = 24;
				starInfo.etFrameRate = 24;
				starInfo.etFadeIn = 48;
				starInfo.ddBlendModeIndex = 0;
				starInfo.ddBlendModeText = "Normal";
				starInfo.cbAutoAlign = false;
				starInfo.cb16bitOrMask = false;
                starInfo.rbMaskReveals = true;
				
				// see if we have last run params
				try {
					var d = app.getCustomOptions( "78b532eb-d010-4c6a-8e54-c75fa8f7760a" );
					drbrownserv.descriptorToObject( starInfo, d );
					d = null;
				}
				catch( e ) {
						// it's ok if we don't have any options, continue with defaults
				}
				
                // use the fit image automation plug-in to do this work for me
                drbrownserv.fitImage = function ( inWidth, inHeight ) {
	                if ( inWidth == undefined || inHeight == undefined ) {
		                alert( strWidthAndHeight );
		                return;
	                }
	                var desc = new ActionDescriptor();
	                var unitPixels = charIDToTypeID( '#Pxl' );
	                desc.putUnitDouble( charIDToTypeID( 'Wdth' ), unitPixels, inWidth );
	                desc.putUnitDouble( charIDToTypeID( 'Hght' ), unitPixels, inHeight );
	                var runtimeEventID = stringIDToTypeID( "3caa3434-cb67-11d1-bc43-0060b0a13dc4" );	
	                executeAction( runtimeEventID, desc, DialogModes.NO );
                }

                // pass in seconds or frames NOT both
                drbrownserv.setFrameRateAndSeconds = function (frameRate, docSeconds, docFrames) {
                    
                    var idsetd = charIDToTypeID( "setd" );
                    var descriptor = new ActionDescriptor();
                    var idnull = charIDToTypeID( "null" );
                    var ref = new ActionReference();
                    var idPrpr = charIDToTypeID( "Prpr" );
                    var iddocumentTimelineSettings = stringIDToTypeID( "documentTimelineSettings" );
                    ref.putProperty( idPrpr, iddocumentTimelineSettings );
                    var idtimeline = stringIDToTypeID( "timeline" );
                    ref.putClass( idtimeline );
                    descriptor.putReference( idnull, ref );
                    var idduration = stringIDToTypeID( "duration" );
                    var durationDesc = new ActionDescriptor();
                    var idseconds = stringIDToTypeID( "seconds" );
                    durationDesc.putInteger( idseconds, docSeconds );
                    var idframe = stringIDToTypeID( "frame" );
                    durationDesc.putInteger( idframe, docFrames );
                    var idframeRate = stringIDToTypeID( "frameRate" );
                    durationDesc.putDouble( idframeRate, frameRate );
                    var idtimecode = stringIDToTypeID( "timecode" );
                    descriptor.putObject( idduration, idtimecode, durationDesc );
                    var idframeRate = stringIDToTypeID( "frameRate" );
                    descriptor.putDouble( idframeRate, frameRate );
                    executeAction( idsetd, descriptor, DialogModes.NO );

                }

                drbrownserv.setTime  = function (minutes, seconds, frame, frameRate) {
	                var setID = charIDToTypeID( 'setd' );
	                var nullID = charIDToTypeID( 'null' );
	                var propID = charIDToTypeID( 'Prpr' );
	                var toID = charIDToTypeID( 'T   ' );
                	
	                var timelineID = stringIDToTypeID( "timeline" );

	                var timeID = stringIDToTypeID( "time" );
                	
	                var timecodeID = stringIDToTypeID( "timecode" );
                	
	                var minutesID = stringIDToTypeID( "minutes" );
	                var secondsID = stringIDToTypeID( "seconds" );
	                var frameID = stringIDToTypeID( "frame" );
	                var frameRateID = stringIDToTypeID( "frameRate" );
                	
	                var timecodeDesc = new ActionDescriptor();
                	
	                timecodeDesc.putInteger( minutesID, minutes );
	                timecodeDesc.putInteger( secondsID, seconds );
	                timecodeDesc.putInteger( frameID, frame );
	                timecodeDesc.putDouble( frameRateID, frameRate );
                	
	                var timelineTimeRef = new ActionReference();
                	
	                timelineTimeRef.putProperty( propID, timeID );
	                timelineTimeRef.putClass( timelineID );
                	
	                var setTimeDesc = new ActionDescriptor();
                	
	                setTimeDesc.putReference( nullID, timelineTimeRef );
	                setTimeDesc.putObject( toID, timecodeID, timecodeDesc );
                	
	                executeAction( setID, setTimeDesc, DialogModes.NO );
                }
				
				
                drbrownserv.convertAnimation = function () {
					var idconvertAnimation = stringIDToTypeID( "convertAnimation" );
					var animdesc8 = new ActionDescriptor();
					executeAction( idconvertAnimation, animdesc8, DialogModes.NO );
				}
                
                drbrownserv.enableOpacityTrack = function () {
                    var id1567 = stringIDToTypeID( "enable" );
                    var desc522 = new ActionDescriptor();
                    var id1568 = charIDToTypeID( "null" );
                        var ref178 = new ActionReference();
                        var id1569 = stringIDToTypeID( "animationTrack" );
                        var id1570 = stringIDToTypeID( "stdTrackID" );
                        var id1571 = stringIDToTypeID( "opacityTrack" );
                        ref178.putEnumerated( id1569, id1570, id1571 );
                    desc522.putReference( id1568, ref178 );
                    executeAction( id1567, desc522, DialogModes.NO );
                }
                
                drbrownserv.makeKeyframeOpacityTrack = function () {
                    var id1870 = charIDToTypeID( "Mk  " );
                    var desc583 = new ActionDescriptor();
                    var id1871 = charIDToTypeID( "null" );
                        var ref227 = new ActionReference();
                        var id1872 = stringIDToTypeID( "animationKey" );
                        ref227.putClass( id1872 );
                        var id1873 = stringIDToTypeID( "animationTrack" );
                        var id1874 = stringIDToTypeID( "stdTrackID" );
                        var id1875 = stringIDToTypeID( "opacityTrack" );
                        ref227.putEnumerated( id1873, id1874, id1875 );
                    desc583.putReference( id1871, ref227 );
                    executeAction( id1870, desc583, DialogModes.NO );
                }

                var dlgResource = "dialog { orientation: 'row', alignChildren: 'top', alignment: 'fill', text: 'Dr. Browns TBD', \
				    grpLeft: Group { orientation: 'column', alignChildren: 'left', \
					 grpOne: Group { orientation: 'row', \
                      icnOne: Image { icon: 'Step1Icon', helpTip: 'Select stacking method' }, \
                      stOne: StaticText { text: 'Select stacking method' }, \
                     }, \
					 grpTop: Group { orientation: 'row', alignChildren: 'left', \
					  grpOne: Group { orientation: 'row', \
                       icnNSOne: Image { icon: 'Step1Icon', helpTip: 'Select stacking method', visible: false }, \
					  }, \
					  grpStaticText: Group { orientation: 'column', alignChildren: 'left', \
					   grpAlign: Group { orientation: 'row', \
					    stName: StaticText { text: 'Name:' }, etDummy: EditText { text: 'hi', visible: false }, \
					   }, \
					   grpAlign1: Group { orientation: 'row', \
					    stTime: StaticText { text: 'Transition Time:' }, etDummy1: EditText { text: 'hi', visible: false }, \
					   }, \
					   grpAlign2: Group { orientation: 'row', \
					    stFrameRate: StaticText { text: 'Frame Rate:' }, etDummy2: EditText { text: 'hi', visible: false }, \
					   }, \
					   grpAlign3: Group { orientation: 'row', \
					    stTimeBetween: StaticText { text: 'Fade in Time:' }, etDummy3: EditText { text: 'hi', visible: false }, \
					   }, \
					  }, \
					  grpData: Group { orientation: 'column', alignChildren: 'left', \
					   etName: EditText { text: '', properties: { idString: 'etName' } }, \
					   etTransition: EditText { text: '24', properties: { idString: 'etTransition' } }, \
					   etFrameRate: EditText { text: '24', properties: { idString: 'etFrameRate' } }, \
					   etFadeIn: EditText { text: '48', properties: { idString: 'etFadeIn' } }, \
					  }, \
					 }, \
                     line1: Panel { bounds: [ 0, 0, 250, 0], properties: { borderStyle: 'sunken' } }, \
					 grpTwo: Group { orientation: 'row', \
                      icnTwo: Image { icon: 'Step2Icon', helpTip: 'Select settings' }, \
                      stTwo: StaticText { text: 'Select settings' }, \
					 }, \
                     grpMode: Group { orientation: 'stack', alignment: 'top', margins: [ 30, 0, 0, 0], \
                      pnlStackMode: Panel { text: 'Set Stack Mode:', properties: { idString: 'pnlStackMode' } \
					  ddStackMode: DropDownList { properties: { idString: 'ddStackMode', items: [ 'None', '-', 'Entropy', 'Kurtosis', 'Maximum', 'Mean', 'Median', 'Minimum', 'Range', 'Skewness', 'Standard Deviation', 'Summation', 'Variance' ] } }, \
					  }, \
					  pnlBlendMode: Panel { text: 'Set Blend Mode:', properties: { idString: 'pnlBlendMode' } \
					   ddBlendMode: DropDownList { properties: { idString: 'ddBlendMode', items: [ 'Normal', 'Dissolve', '-', 'Darken', 'Multiply', 'Color Burn', 'Linear Burn', 'Darker Color', '-', 'Lighten', 'Screen', 'Color Dodge', 'Linear Dodge (Add)', 'Lighter Color', '-', 'Overlay', 'Soft Light', 'Hard Light', 'Vivid Light', 'Linear Light', 'Pin Light', 'Hard Mix', '-', 'Difference', 'Exclusion', 'Subtract', 'Divide', '-', 'Hue', 'Saturation', 'Color', 'Luminosity' ] } }, \
					  }, \
                     }, \
                     grpBottom: Group { orientation: 'column', alignment: 'left', alignChildren: 'left', margins: [ 30, 0, 0, 0], \
                      cbAutoAlign: Checkbox { text: 'Auto Align', margins: [ 0, 0, 0, 0], properties: { idString: 'cbAutoAlign' } }, \
					  cb16bitOrMask: Checkbox { text: 'Add layer mask to each layer', margins: [ 0, 0, 0, 0], properties: { idString: 'cb16bitOrMask' } }, \
                      grpMoveOver: Group { orientation: 'column', alignChildren: 'left', margins: [ 15, 0, 0, 0], \
                       rbMaskReveals: RadioButton { text: 'Mask reveals layer', properties: { idString: 'rbMaskReveals' } }, \
                       rbMaskHides: RadioButton { text: 'Mask hides layer', properties: { idString: 'rbMaskHides' } }, \
                      }, \
					  stDefaultImage: StaticText { text: '( The default image size is 1024 x 768 )' }, \
					 }, \
					}, \
					grpButtons: Group { orientation: 'column', alignment: 'top', \
					 btnOK: Button { text: 'OK', properties: { idString: 'btnOK' } }, \
					 btnCancel: Button { text: 'Cancel', properties: { idString: 'btnCancel' } }, \
					}, \
				   }";

                // add these lines in for overlap
                //					 grpAlign4: Group { orientation: 'row', \
                //					  stOverlap: StaticText { text: 'Transition overlap:' }, \
                //					  etDummy4: EditText { text: 'hi', visible: false }, \
                //					 }, \
                //					 etOverlap: EditText { text: '0', properties: { idString: 'etOverlap' } }, \
                
                //		             ddTime: DropDownList { properties: { idString: 'ddTime', items: [ 'seconds per image', 'total time' ] } }, \
                //					grpFrameRate: Group { \
	            //				 stFPS: StaticText { text: 'fps' } \
		        //			}, \

                //					grpTimeBetween: Group { \
	            //				 stSecs: StaticText { text: 'sec' } \
		        //			}, \
                //					grpOverlap: Group { \
	            //				 stSecs2: StaticText { text: 'sec' } \
		        //			} \

                var idOK = 1;			
                var idCancel = 2;			
                var nameSize = 120;
                var editTextMinSize = 50;

                var dlg = new Window( dlgResource );					

                drbrownserv.flattenDialog( dlg, dlg );

                dlg.text = "Dr. Brown's Time Lapse Assistant";
				
				dlg.etName.text = starInfo.etName;
				dlg.etTransition.text = starInfo.etTransition;
				dlg.etFrameRate.text = starInfo.etFrameRate;
				dlg.etFadeIn.text = starInfo.etFadeIn;
				dlg.ddBlendMode.items [ starInfo.ddBlendModeIndex ].selected = true;
				dlg.cbAutoAlign.value = starInfo.cbAutoAlign;
				dlg.cb16bitOrMask.value = starInfo.cb16bitOrMask;
                dlg.rbMaskReveals.value = starInfo.rbMaskReveals;
				dlg.rbMaskHides.value = ! dlg.rbMaskReveals.value;

                dlg.etName.preferredSize.width = nameSize;
                dlg.etTransition.preferredSize.width = editTextMinSize;
                dlg.etFrameRate.preferredSize.width = editTextMinSize;
                dlg.etFadeIn.preferredSize.width = editTextMinSize;

				dlg.cb16bitOrMask.onClick = function( ) {
                         dlg.grpLeft.grpBottom.grpMoveOver.rbMaskReveals.enabled = this.value;
                         dlg.grpLeft.grpBottom.grpMoveOver.rbMaskHides.enabled = this.value;
                     }

				dlg.cb16bitOrMask.onClick ();
				
                dlg.center();

                if ( idOK == dlg.show() ) {
					// get everything back from the dialog
					starInfo.etName = dlg.etName.text;
	                starInfo.etFadeIn = Math.max( Number( dlg.etFadeIn.text ), 1 );
	                starInfo.etTransition = Math.max( Number( dlg.etTransition.text ), 1 );
	                starInfo.etFrameRate = Math.max( Number( dlg.etFrameRate.text ), 1 );
					starInfo.ddBlendModeIndex = dlg.ddBlendMode.selection.index;
                    starInfo.ddBlendModeText = dlg.ddBlendMode.selection.text;
					starInfo.cbAutoAlign = dlg.cbAutoAlign.value;
					starInfo.cb16bitOrMask = dlg.cb16bitOrMask.value;
                    starInfo.rbMaskReveals = dlg.rbMaskReveals.value;

					// save them off for the next time
					var d = drbrownserv.objectToDescriptor( starInfo );
					d.putString( app.charIDToTypeID( 'Msge' ), "Dr. Brown's Time Lapse Assistant options" );
					app.putCustomOptions( "78b532eb-d010-4c6a-8e54-c75fa8f7760a", d );
					d = null;

					var	starDoc = app.documents.add( UnitValue( 1024, "px" ), UnitValue( 768, "px" ), 72, starInfo.etName, NewDocumentMode.RGB, DocumentFill.BACKGROUNDCOLOR );

					drbrownserv.showPanelByID( "panelid.static.animation" );
					drbrownserv.convertAnimation();
    				
					var firstRealLayer;
					
					for ( var i = 0; i < files.length; i++ ) {
					    try {
    						var newDoc = open( files[ i ] );
						    drbrownserv.fitImage( 1024, 768 );
						    newDoc.selection.selectAll();
						    newDoc.selection.copy();
						    var docSplit = files[ i ].toString().split( "/" );
						    var fileName = docSplit[ docSplit.length - 1 ];
						    activeDocument = starDoc;
						    starDoc.paste();
						    starDoc.activeLayer.name = decodeURI( fileName );
							if (firstRealLayer == undefined) {
								firstRealLayer = starDoc.activeLayer.name;
							}
						    newDoc.close( SaveOptions.DONOTSAVECHANGES );
					    }
					
    					catch(e) {
	    					alert( "ERROR drBrownsStarShow: " + e + ":" + e.line); // tpr remove
		    			}
			    	} // for loop for adding in the layers
					
                    if ( starInfo.cbAutoAlign ) {
						// select them all except the background layer
						drbrownserv.selectAdditionalLayer( firstRealLayer );
                                
						var alignID = charIDToTypeID( "Algn" );
                        var alignDesc = new ActionDescriptor();
                        var nullID = charIDToTypeID( "null" );
                        var alignRef = new ActionReference();
                        alignRef.putEnumerated( charIDToTypeID( "Lyr " ), charIDToTypeID( "Ordn" ), charIDToTypeID( "Trgt" ) );
                        alignDesc.putReference( nullID, alignRef );
                        alignDesc.putEnumerated( charIDToTypeID( "Usng" ), charIDToTypeID( "ADSt" ), stringIDToTypeID( "ADSContent" ) );
                        alignDesc.putEnumerated( charIDToTypeID( "Aply" ), stringIDToTypeID( "projection" ), charIDToTypeID( "Auto" ) );
                        executeAction( alignID, alignDesc, DialogModes.NO );

						// deselect them all first
						// if you select a layer that is already in a multi selection then
						// it is typcically not what you want, we need one and only one selected
						for ( var i = 1; i < starDoc.artLayers.length; i++ ) {
							drbrownserv.unselectAdditionalLayer( starDoc.artLayers[i].name );
						}
                    }

					// must loop again to add the mask as 
					// doing it before the align will cause nothing to get aligned
					for ( var i = 0; i < starDoc.artLayers.length; i++ ) {
						starDoc.activeLayer = starDoc.artLayers[i];
						if (starDoc.activeLayer.isBackgroundLayer) {
							continue;
						}
						if ( starInfo.ddBlendModeText != "Normal" ) {
                            starDoc.activeLayer.blendMode = drbrownserv.textToBlendMode( starInfo.ddBlendModeText );
                        }
                        drbrownserv.addMaskAsNeeded( starInfo.cb16bitOrMask, starInfo.rbMaskReveals );
					}



	                var doc = activeDocument;
	                // the bottom layer is the background
	                var layerIndex = doc.artLayers.length - 2;
	                var currentFrame = 0;
					

                    // we are working in frames now
	                drbrownserv.setFrameRateAndSeconds( starInfo.etFrameRate, 0, starInfo.etFadeIn + layerIndex * starInfo.etTransition + 1 );

                    var oneShot = true;
                    
                	while ( layerIndex >= 0 ) {
	                    var lay = doc.artLayers[layerIndex];
	                    doc.activeLayer = lay;
                        drbrownserv.setTime(0, 0, currentFrame, starInfo.etFrameRate ); // minutes, seconds, frame, frameRate
	                    drbrownserv.enableOpacityTrack();
	                    lay.opacity = 0;
                        if (oneShot) {
                            currentFrame += starInfo.etFadeIn;
                            oneShot = false;
                        } else {
                            currentFrame += starInfo.etTransition;
                        }
                        drbrownserv.setTime(0, 0, currentFrame, starInfo.etFrameRate ); // minutes, seconds, frame, frameRate
	                    lay.opacity = 100;
                        drbrownserv.makeKeyframeOpacityTrack();
	                    layerIndex--;
	                } // while ( layerIndex >= 0 ) 
	
                } // if ( idOK == dlg.show() )

				delete drbrownserv.fitImage;
				delete drbrownserv.setFrameRateAndSeconds;
				delete drbrownserv.setTime;
				delete drbrownserv.enableOpacityTrack;
				delete drbrownserv.convertAnimation;
				delete drbrownserv.makeKeyframeOpacityTrack;
			} // if not photoshop or photoshop
		} // try block
		
		catch (error) {
			alert( "ERROR Star Show: " + error + ":" + error.line); // tpr remove
			if (error.number != 8007) // Don't report user cancelled errors.
				alert (error); //  + ":" + error.line);
		}
	}


	//-----------------------------------------------------------------
	// This routine is called when the Dr. Browns merge a matic menu
	// item is chosen.
	//-----------------------------------------------------------------
	drbrownserv.drBrownsStarShowFromBridge = function () {
		try {
			var files = photoshop.getBridgeFileListForAutomateCommand (false);
			
			if (files.length != 0)
				drbrownserv.drBrownsStarShow (files);
		}
		
		catch (error) {
			if (error.number != 8007) // Don't report user cancelled errors.
				alert (error); //  + ":" + error.line);
		}
	}

    //-----------------------------------------------------------------
	// This routine takes an array of files. If called by Photoshop,
	// it will convert each file to placed smart object on a layer. 
	// If called by any other app, it will send a BridgeTalk message
	// to Photoshop to invoke this routine with the same arguments.
	// If only one file is selected it will place until the user
	// selects cancel or done in the RAW dialog
	//-----------------------------------------------------------------
	drbrownserv.drBrownsPlaceAMatic = function (/* Array */ files, /* new doc depth */ depth) {
		try {
			if (BridgeTalk.appName != "photoshop") {
				// Bring Photoshop to the foreground.
				BridgeTalk.bringToFront ("photoshop");
			
				// Create a new BridgeTalk message for Photoshop to invoke
				// this routine on the other side of the else
				// with the selected files
				var btMessage = new BridgeTalk;
				btMessage.target = "photoshop";
				btMessage.body = "drbrownserv.drBrownsPlaceAMatic (" + files.toSource () + ", " + depth + ");";
				btMessage.send();

			} else {

				if ( files == undefined ) return;
				if ( files.length == undefined ) return;
				if ( files.length == 0 ) return;

				var PlaceFile = function( inFile ) {
					var id18 = charIDToTypeID( "Plc " );
					var desc = new ActionDescriptor();
					var id19 = charIDToTypeID( "null" );
					desc.putPath( id19, inFile );
					var id20 = charIDToTypeID( "FTcs" );
					var id21 = charIDToTypeID( "QCSt" );
					var id22 = charIDToTypeID( "Qcsa" );
					desc.putEnumerated( id20, id21, id22 ); // not sure what this does
					var id23 = charIDToTypeID( "Ofst" );
					var descObj = new ActionDescriptor();
					var id24 = charIDToTypeID( "Hrzn" );
					var id25 = charIDToTypeID( "#Pxl" );
					descObj.putUnitDouble( id24, id25, 0.000000 ); // could add that to the call
					var id26 = charIDToTypeID( "Vrtc" );
					var id27 = charIDToTypeID( "#Pxl" );
					descObj.putUnitDouble( id26, id27, 0.000000 ); // and maybe this
					var id28 = charIDToTypeID( "Ofst" );
					desc.putObject( id23, id28, descObj );
					var descResult = executeAction( id18, desc, DialogModes.NO );
					desc = null;
					descObj = null;
					descResult = null;
					$.gc();
				}
            
                 var RevealAll = function() {
                    var idRvlA = charIDToTypeID( "RvlA" );
                    var desc106 = new ActionDescriptor();
                    var descResult = executeAction( idRvlA, desc106, DialogModes.NO );
                    desc106 = null;
                    descResult = null;
                    $.gc();
                 }
            
                 var Trim = function() {
                    var idtrim = stringIDToTypeID( "trim" );
                    var desc113 = new ActionDescriptor();
                    var idtrimBasedOn = stringIDToTypeID( "trimBasedOn" );
                    var idtrimBasedOn = stringIDToTypeID( "trimBasedOn" );
                    var idTrns = charIDToTypeID( "Trns" );
                    desc113.putEnumerated( idtrimBasedOn, idtrimBasedOn, idTrns );
                    var idTop = charIDToTypeID( "Top " );
                    desc113.putBoolean( idTop, true );
                    var idBtom = charIDToTypeID( "Btom" );
                    desc113.putBoolean( idBtom, true );
                    var idLeft = charIDToTypeID( "Left" );
                    desc113.putBoolean( idLeft, true );
                    var idRght = charIDToTypeID( "Rght" );
                    desc113.putBoolean( idRght, true );
                    var descResult = executeAction( idtrim, desc113, DialogModes.NO );
                    desc113 = null;
                    descResult = null;
                    $.gc();
                 }

				var firstDoc = open( files[ 0 ] );

				// switch the units, we can't handle percentage units
				var startRulerUnits = preferences.rulerUnits;
				preferences.rulerUnits = Units.PIXELS;

				var w = firstDoc.width;
				var h = firstDoc.height;
				var r = firstDoc.resolution;
                 var xmp = firstDoc.xmpMetadata.rawData;

				preferences.rulerUnits = startRulerUnits;

				firstDoc.close( SaveOptions.DONOTSAVECHANGES );
				
				var docSplit = files[ 0 ].toString().split( "/" );

				var fileName = docSplit[ docSplit.length - 1 ];

				firstDoc = documents.add( w, h, r, decodeURI( fileName ) );
                
                 firstDoc.xmpMetadata.rawData = xmp;

				if (depth == 16) {
					// Convert the doc to 16-bit.
					app.activeDocument.bitsPerChannel = BitsPerChannelType.SIXTEEN;
				}

				firstLayer = app.activeDocument.activeLayer;


				if ( files.length == 1 ) {

					try {
						// ideally we would like to loop and have the user cancel
						// when they have placed enough of them
						// the problem is that non-camera raw files will not pop
						// a dialog and could get out of control
						// a work around would be to put a timer or counter and
						// try to stop when things get out of control
						// for now we will just place two of them
						// while (true) {
							PlaceFile( files[ 0 ] );
                             activeDocument.activeLayer.xmpMetadata.rawData = xmp;
							PlaceFile( files[ 0 ] );
                             activeDocument.activeLayer.xmpMetadata.rawData = xmp;
						// }
					}

					catch(error) {
						// drbrownserv.alert (error + "A:A" + error.line);
					}

				} else {
					
					for ( var i = 0; i < files.length; i++ ) {
			
						try {
                             var getXMPFromFile = open( files[ i ] );
                             xmp = getXMPFromFile.xmpMetadata.rawData;
                             getXMPFromFile.close( SaveOptions.DONOTSAVECHANGES );
							PlaceFile( files[ i ] );
                             activeDocument.activeLayer.xmpMetadata.rawData = xmp;
						}
						
						catch(error) {
							// drbrownserv.alert (error + ":T:T:" + error.line);
						}
					}

				}

				firstLayer.remove();
                 
                 // ok, really odd, probably a bug
                 // some images will get placed to the right by one pixel
                 // doing these two steps brings them back
                 RevealAll();
                 Trim();

				delete PlaceFile;

			}
		}
		
		catch (error) {
			if (error.number != 8007) // Don't report user cancelled errors.
				drbrownserv.alert (error); //  + ":" + error.line);
		}
	}


	//-----------------------------------------------------------------
	// This routine is called when the Bridge's PDF Presentation menu
	// item is chosen.
	//-----------------------------------------------------------------
	drbrownserv.drBrownsPlaceAMaticFromBridge8 = function () {
		try {
			var files = photoshop.getBridgeFileListForAutomateCommand (false);

			if (files.length != 0)
				drbrownserv.drBrownsPlaceAMatic (files, 8);
		}
		
		catch (error) {
			if (error.number != 8007) // Don't report user cancelled errors.
				drbrownserv.alert (error); //  + ":" + error.line);
		}

	}

	//-----------------------------------------------------------------
	// This routine is called when the Bridge's PDF Presentation menu
	// item is chosen.
	//-----------------------------------------------------------------
	drbrownserv.drBrownsPlaceAMaticFromBridge16 = function () {
		try {
			var files = photoshop.getBridgeFileListForAutomateCommand (false);

			if (files.length != 0)
				drbrownserv.drBrownsPlaceAMatic (files, 16);
		}
		
		catch (error) {
			if (error.number != 8007) // Don't report user cancelled errors.
				drbrownserv.alert (error); //  + ":" + error.line);
		}

	}


	//-----------------------------------------------------------------
	// The code below inserts the Dr. Brown's Star Show menu item 
	// into the Bridge menus.
	//-----------------------------------------------------------------
	if (BridgeTalk.appName == "bridgeDONTINSTALL") { // tpr should be bridge
		// Use temp function to keep vars out of global namespace.
		drbrownserv.tempFunction = function () {
			// Set up the info necessary for inserting this item into the Bridge's menus later.
			var menuItemInfo = new Object;
			menuItemInfo.text = "Dr. Brown's Time Lapse Assistant"; 
			menuItemInfo.name = "DrBrownsStarShow";
			menuItemInfo.onDisplay = drbrownserv.alwaysEnabled;
			menuItemInfo.onSelect = drbrownserv.drBrownsStarShowFromBridge;
		
			drbrownserv.menuItemInfoArray.push (menuItemInfo);
		}
	
		drbrownserv.tempFunction ();
		delete drbrownserv.tempFunction;
	}

	
    //-----------------------------------------------------------------
	// The code below inserts the Dr. Brown's Place-A-Matic 16 bit menu item 
	// into the Bridge menus.
	//-----------------------------------------------------------------
	if (BridgeTalk.appName == "bridge") {
		// Use temp function to keep vars out of global namespace.
		drbrownserv.tempFunction = function () {
			// Set up the info necessary for inserting this item into the Bridge's menus later.
			var menuItemInfo = new Object;
			menuItemInfo.text = "Dr. Brown's Place-A-Matic 16 bit"; 
			menuItemInfo.name = "DrBrownsPlaceAMatic16";
			menuItemInfo.onDisplay = drbrownserv.alwaysEnabled;
			menuItemInfo.onSelect = drbrownserv.drBrownsPlaceAMaticFromBridge16;
		
			drbrownserv.menuItemInfoArray.push (menuItemInfo);
		}
	
		drbrownserv.tempFunction ();
		delete drbrownserv.tempFunction;
	}

	
	//-----------------------------------------------------------------
	// The code below inserts the Dr. Brown's Place-A-Matic 8 bit menu item 
	// into the Bridge menus.
	//-----------------------------------------------------------------
	if (BridgeTalk.appName == "bridge") {
		// Use temp function to keep vars out of global namespace.
		drbrownserv.tempFunction = function () {
			// Set up the info necessary for inserting this item into the Bridge's menus later.
			var menuItemInfo = new Object;
			menuItemInfo.text = "Dr. Brown's Place-A-Matic 8 bit"; 
			menuItemInfo.name = "DrBrownsPlaceAMatic8";
			menuItemInfo.onDisplay = drbrownserv.alwaysEnabled;
			menuItemInfo.onSelect = drbrownserv.drBrownsPlaceAMaticFromBridge8;
		
			drbrownserv.menuItemInfoArray.push (menuItemInfo);
		}
	
		drbrownserv.tempFunction ();
		delete drbrownserv.tempFunction;
	}

	
	//-----------------------------------------------------------------
	// The code below inserts the Dr. Brown's Stack-A-Matic menu item 
	// into the Bridge menus. This only works in CS3 or better.
	//-----------------------------------------------------------------
	if (BridgeTalk.appName == "bridge") {
		// Use temp function to keep vars out of global namespace.
		drbrownserv.tempFunction = function () {
			// Set up the info necessary for inserting this item into the Bridge's menus later.
			var menuItemInfo = new Object;
			menuItemInfo.text = "Dr. Brown's Stack-A-Matic"; 
			menuItemInfo.name = "DrBrownsStackAMatic";
			menuItemInfo.onDisplay = drbrownserv.alwaysEnabled;
			menuItemInfo.onSelect = drbrownserv.drBrownsStackAMaticFromBridge;
		
			drbrownserv.menuItemInfoArray.push (menuItemInfo);
		}
	
		drbrownserv.tempFunction ();
		delete drbrownserv.tempFunction;
	}

	
	//-----------------------------------------------------------------
	// The code below inserts separater
	//-----------------------------------------------------------------
	if (BridgeTalk.appName == "bridge") {	
		// Use temp function to keep vars out of global namespace.
		drbrownserv.tempFunction = function () {
			// Set up the info necessary for inserting this item into the Bridge's menus later.
			var menuItemInfo = new Object;
			menuItemInfo.text = "------";
			menuItemInfo.name = 'foo1';
			//menuItemInfo.onDisplay = drbrownserv.alwaysEnabled;
			//menuItemInfo.onSelect = drbrownserv.captionmakerFromBridge;
			
			drbrownserv.menuItemInfoArray.push (menuItemInfo);
			}
		
		drbrownserv.tempFunction ();
		delete drbrownserv.tempFunction;
		}

	//-----------------------------------------------------------------
	// The code below inserts the Dr. Brown's 1-2-3 Process menu item into the
	// Bridge menus.
	//-----------------------------------------------------------------
	if (BridgeTalk.appName == "bridge") {	
		// Use temp function to keep vars out of global namespace.
		drbrownserv.tempFunction = function () {
			// Set up the info necessary for inserting this item into the Bridge's menus later.
			var menuItemInfo = new Object;
			menuItemInfo.text = "Image Processor Pro";
			menuItemInfo.name = 'Process123';
			menuItemInfo.onDisplay = drbrownserv.alwaysEnabled;
			menuItemInfo.onSelect = drbrownserv.process123FromBridge;
			
			drbrownserv.menuItemInfoArray.push (menuItemInfo);
			}
		
		drbrownserv.tempFunction ();
		delete drbrownserv.tempFunction;
		}


	//=================================================================
	// Setup Tools > Photoshop menu in Bridge.
	// Creates the menu, then sorts all the menu items we want to
	// create before actually adding them to the menu.
	//=================================================================

	if (BridgeTalk.appName == "bridge") {
	
		// Use temp function to keep vars out of global namespace.
		drbrownserv.tempFunction = function () {
			// The 'Photoshop Services' menu is installed by OLS, the 'Photoshop' menu
			// in installed either by this script, or by the Workflow Automation Scripts
			// (AdobeLibrary1.jsx) which also install menus for other apps. To get the
			// menus in the correct order, all three scripts cooperate - so make sure
			// you are aware of what's happening before changing this code.
			var psServicesMenuExists = MenuElement.find ('Tools/DrBrownsServices') != null;
		
			// Add a new Photoshop submenu in the Bridge's Tools menu.
			drBrownsSubMenu = MenuElement.create (	"menu",
													"Dr. Brown's Services " + drbrownserv.version,
													'-after submenu/VersionCue', 
													'tools/drbr');

			drBrownsSubMenu.onDisplay = drbrownserv.alwaysEnabled;
		
			// Define a function that will sort the menu items for us.
			function menuTextOrder (a, b) {
				// Pass 'a' into 'b' to get reverse sort order so that they can be
				// added at the top of the menu and still be in alphabetical order
				// (the WAS scripts install additional menu items that end up below
				// these).
				return b.text.toLocaleLowerCase ().localeCompare (a.text.toLocaleLowerCase ());
			}
		
			// Sort the menu items
			// drbrownserv.menuItemInfoArray.sort (menuTextOrder);
		
			// Add the menu items to the Photoshop menu.
			for (var index = 0; index < drbrownserv.menuItemInfoArray.length; index++) {
				var menuItemInfo = drbrownserv.menuItemInfoArray[index];

				var menuItem = MenuElement.create (	'command',
													menuItemInfo.text,
													'at the beginning of tools/drbr',
													menuItemInfo.name);
			
				menuItem.onDisplay = menuItemInfo.onDisplay;
				menuItem.onSelect = menuItemInfo.onSelect;	
			}
		
			delete drbrownserv.menuItemInfoArray;
		}
		
		drbrownserv.tempFunction ();
		delete drbrownserv.tempFunction;
	}



	///////////////////////////////////////////////////////////////////////////////
	// Function: descriptorToObject
	// Usage: update a JavaScript Object from an ActionDescriptor
	// Input: JavaScript Object (o), current object to update (output)
	//        Photoshop ActionDescriptor (d), descriptor to pull new params for object from
	//        JavaScript Function (f), post process converter utility to convert
	// Return: Nothing, update is applied to passed in JavaScript Object (o)
	// NOTE: Only boolean, string, and number are supported, use a post processor
	//       to convert (f) other types to one of these forms.
	///////////////////////////////////////////////////////////////////////////////
	drbrownserv.descriptorToObject = function  (o, d, f) {
		var l = d.count;
		for (var i = 0; i < l; i++ ) {
			var k = d.getKey(i); // i + 1 ?
			var t = d.getType(k);
			strk = app.typeIDToStringID(k);
			switch (t) {
				case DescValueType.BOOLEANTYPE:
					o[strk] = d.getBoolean(k);
					break;
				case DescValueType.STRINGTYPE:
					o[strk] = d.getString(k);
					break;
				case DescValueType.DOUBLETYPE:
					o[strk] = d.getDouble(k);
					break;
				case DescValueType.INTEGERTYPE:
				case DescValueType.ALIASTYPE:
				case DescValueType.CLASSTYPE:
				case DescValueType.ENUMERATEDTYPE:
				case DescValueType.LISTTYPE:
				case DescValueType.OBJECTTYPE:
				case DescValueType.RAWTYPE:
				case DescValueType.REFERENCETYPE:
				case DescValueType.UNITDOUBLE:
				default:
					throw( new Error("Unsupported type in descriptorToObject " + t ) );
			}
		}
		if (undefined != f) {
			o = f(o);
		}
	}

	///////////////////////////////////////////////////////////////////////////////
	// Function: objectToDescriptor
	// Usage: create an ActionDescriptor from a JavaScript Object
	// Input: JavaScript Object (o)
	//        Pre process converter (f)
	// Return: ActionDescriptor
	// NOTE: Only boolean, string, and number are supported, use a pre processor
	//       to convert (f) other types to one of these forms.
	///////////////////////////////////////////////////////////////////////////////
	drbrownserv.objectToDescriptor = function  (o, f) {
		if (undefined != f) {
			o = f(o);
		}
		var d = new ActionDescriptor;
		var l = o.reflect.properties.length;
		for (var i = 0; i < l; i++ ) {
			var k = o.reflect.properties[i].toString();
			if (k == "__proto__" || k == "__count__" || k == "__class__" || k == "reflect")
				continue;
			var v = o[ k ];
			k = app.stringIDToTypeID(k);
			switch ( typeof(v) ) {
				case "boolean":
					d.putBoolean(k, v);
					break;
				case "string":
					d.putString(k, v);
					break;
				case "number":
					d.putDouble(k, v);
					break;
				default:
					throw( new Error("Unsupported type in objectToDescriptor " + typeof(v) ) );
			}
		}
		return d;
	}


	///////////////////////////////////////////////////////////////////////////////
	// Function: flattenDialog
	// Usage: find all the idString and make them properties on t
	///////////////////////////////////////////////////////////////////////////////
	drbrownserv.flattenDialog = function ( t, w ) {
		if ( w.type == 'dialog' || w.type == 'group' || w.type == 'panel' ) {
			for ( i in w ) {
				try {
					if ( w[i] != undefined && ( w[i].type == 'dialog' || w[i].type == 'group' || w[i].type == 'panel' ) && i != 'parent' && i != 'indent' && i != 'window'  ) {
						drbrownserv.flattenDialog( t, w[i] );
					} else {
						if ( w[i] != undefined && w[i].properties != undefined && w[i].properties.idString != undefined ) {
							// turn this off when your done debugging your dialog code
							// if ( t[w[i].properties.idString] != undefined ) {
							//    drbrownserv.alert('Already have a a ' + w[i].properties.idString + ' property.' ); 
							//}
							t[w[i].properties.idString] = w[i];
						}
					}
				}
				catch(e) {
					drbrownserv.alert(e + ":" + e.line);
				} 
			}
		}
	}
	
	drbrownserv.selectAdditionalLayer = function( layerName ) {
		var id44 = charIDToTypeID( "slct" );
		var desc9 = new ActionDescriptor();
		var id45 = charIDToTypeID( "null" );
		var ref8 = new ActionReference();
		var id46 = charIDToTypeID( "Lyr " );
		ref8.putName( id46, layerName );
		desc9.putReference( id45, ref8 );
		var id47 = stringIDToTypeID( "selectionModifier" );
		var id48 = stringIDToTypeID( "selectionModifierType" );
		var id49 = stringIDToTypeID( "addToSelectionContinuous" );
		desc9.putEnumerated( id47, id48, id49 );
		var id50 = charIDToTypeID( "MkVs" );
		desc9.putBoolean( id50, false );
		executeAction( id44, desc9, DialogModes.NO );
	}

	drbrownserv.unselectAdditionalLayer = function( layerName ) {
		var idslct = charIDToTypeID( "slct" );
		var desc13 = new ActionDescriptor();
		var idnull = charIDToTypeID( "null" );
        var ref12 = new ActionReference();
        var idLyr = charIDToTypeID( "Lyr " );
        ref12.putName( idLyr, layerName );
		desc13.putReference( idnull, ref12 );
		var idselectionModifier = stringIDToTypeID( "selectionModifier" );
		var idselectionModifierType = stringIDToTypeID( "selectionModifierType" );
		var idremoveFromSelection = stringIDToTypeID( "removeFromSelection" );
		desc13.putEnumerated( idselectionModifier, idselectionModifierType, idremoveFromSelection );
		var idMkVs = charIDToTypeID( "MkVs" );
		desc13.putBoolean( idMkVs, false );
		executeAction( idslct, desc13, DialogModes.NO );
	}

	drbrownserv.selectAllLayers = function( targetDoc ) {
		app.activeDocument = targetDoc;
		targetDoc.activeLayer = targetDoc.layers[0];
		var id268 = charIDToTypeID( "slct" );
		var desc65 = new ActionDescriptor();
		var id269 = charIDToTypeID( "null" );
		var ref59 = new ActionReference();
		var id270 = charIDToTypeID( "Lyr " );
		// ref59.putName( id270, "Layer 1" );
		if ( targetDoc.layers[targetDoc.layers.length-1].isBackgroundLayer ) {
			ref59.putName( id270, localize( "$$$/LayersPalette/Base=Background" ) );
		} else {
			ref59.putIndex( id270, 1 );
		}
		desc65.putReference( id269, ref59 );
		var id271 = stringIDToTypeID( "selectionModifier" );
		var id272 = stringIDToTypeID( "selectionModifierType" );
		var id273 = stringIDToTypeID( "addToSelectionContinuous" );
		desc65.putEnumerated( id271, id272, id273 );
		var id274 = charIDToTypeID( "MkVs" );
		desc65.putBoolean( id274, false );
		executeAction( id268, desc65, DialogModes.NO );
	}

	drbrownserv.duplicateActiveLayersToDoc = function( targetDoc ) {
		var id287 = charIDToTypeID( "Dplc" );
		var desc69 = new ActionDescriptor();
		var id288 = charIDToTypeID( "null" );
		var ref63 = new ActionReference();
		var id289 = charIDToTypeID( "Lyr " );
		var id290 = charIDToTypeID( "Ordn" );
		var id291 = charIDToTypeID( "Trgt" );
		ref63.putEnumerated( id289, id290, id291 );
		desc69.putReference( id288, ref63 );
		var id292 = charIDToTypeID( "T   " );
		var ref64 = new ActionReference();
		var id293 = charIDToTypeID( "Dcmn" );
		ref64.putName( id293, targetDoc.name );
		desc69.putReference( id292, ref64 );
		var id294 = charIDToTypeID( "Vrsn" );
		desc69.putInteger( id294, 2 );
		executeAction( id287, desc69, DialogModes.NO );
	}

	drbrownserv.recursiveCountLayers = function( objToCount, currentCount ) {
		if ( undefined == currentCount ) currentCount = 0;
		try {
			currentCount += objToCount.layers.length;
			for ( var i = 0; i < objToCount.layers.length; i++ ) {
				if ( objToCount.layers[i].typename == "LayerSet" ) {
					currentCount = drbrownserv.recursiveCountLayers( objToCount.layers[i], currentCount );
				}
			}
		}
		catch( e ) { 
			// debugging alert ("recursiveCountLayers " + e + ":" + e.line);
		}
		return currentCount;
	}

	drbrownserv.groupSelectedLayers = function( groupName ) {
		var id63 = charIDToTypeID( "Mk  " );
		var desc13 = new ActionDescriptor();
		var id64 = charIDToTypeID( "null" );
		var ref10 = new ActionReference();
		var id65 = stringIDToTypeID( "layerSection" );
		ref10.putClass( id65 );
		desc13.putReference( id64, ref10 );
		var id66 = charIDToTypeID( "From" );
		var ref11 = new ActionReference();
		var id67 = charIDToTypeID( "Lyr " );
		var id68 = charIDToTypeID( "Ordn" );
		var id69 = charIDToTypeID( "Trgt" );
		ref11.putEnumerated( id67, id68, id69 );
		desc13.putReference( id66, ref11 );
		var id70 = charIDToTypeID( "Usng" );
		var desc14 = new ActionDescriptor();
		var id71 = charIDToTypeID( "Nm  " );
		desc14.putString( id71, groupName );
		var id72 = stringIDToTypeID( "layerSection" );
		desc13.putObject( id70, id72, desc14 );
		executeAction( id63, desc13, DialogModes.NO );
	}


    // from english text names return the blend mode
    drbrownserv.textToBlendMode = function( blendModeText ) {
        switch ( blendModeText ) {
            case 'Dissolve':            return BlendMode.DISSOLVE;
            case 'Darken':              return BlendMode.DARKEN;
            case 'Multiply':            return BlendMode.MULTIPLY;
            case 'Color Burn':          return BlendMode.COLORBURN;
            case 'Linear Burn':         return BlendMode.LINEARBURN;
            case 'Darker Color':        return BlendMode.DARKERCOLOR;
            case 'Lighten':             return BlendMode.LIGHTEN;
            case 'Screen':              return BlendMode.SCREEN;
            case 'Color Dodge':         return BlendMode.COLORDODGE;
            case 'Linear Dodge (Add)':  return BlendMode.LINEARDODGE
            case 'Lighter Color':       return BlendMode.LIGHTERCOLOR;
            case 'Overlay':             return BlendMode.OVERLAY;
            case 'Soft Light':          return BlendMode.SOFTLIGHT;
            case 'Hard Light':          return BlendMode.HARDLIGHT;
            case 'Vivid Light':         return BlendMode.VIVIDLIGHT;
            case 'Linear Light':        return BlendMode.LINEARLIGHT;
            case 'Pin Light':           return BlendMode.PINLIGHT;
            case 'Hard Mix':            return BlendMode.HARDMIX;
            case 'Difference':          return BlendMode.DIFFERENCE;
            case 'Exclusion':           return BlendMode.EXCLUSION;
            case 'Subtract':            return BlendMode.SUBTRACT;
            case 'Divide':              return BlendMode.DIVIDE;
            case 'Hue':                 return BlendMode.HUE;
            case 'Saturation':          return BlendMode.SATURATION;
            case 'Color':               return BlendMode.COLORBLEND;
            case 'Luminosity':          return BlendMode.LUMINOSITY;
        }
        return BlendMode.NORMAL;
    }

    drbrownserv.addMaskAsNeeded = function ( addMask, reveals ) {
        if ( addMask ) {
            var idMk = charIDToTypeID( "Mk  " );
            var desc13 = new ActionDescriptor();
            var idNw = charIDToTypeID( "Nw  " );
            var idChnl = charIDToTypeID( "Chnl" );
            desc13.putClass( idNw, idChnl );
            var idAt = charIDToTypeID( "At  " );
            var ref9 = new ActionReference();
            var idChnl = charIDToTypeID( "Chnl" );
            var idChnl = charIDToTypeID( "Chnl" );
            var idMsk = charIDToTypeID( "Msk " );
            ref9.putEnumerated( idChnl, idChnl, idMsk );
            desc13.putReference( idAt, ref9 );
            var idUsng = charIDToTypeID( "Usng" );
            var idUsrM = charIDToTypeID( "UsrM" );
            var idRvlA = charIDToTypeID( reveals ? "RvlA" : "HdAl" );
            desc13.putEnumerated( idUsng, idUsrM, idRvlA );
            executeAction( idMk, desc13, DialogModes.NO );
        }
    }

	// make sure the string is not really long and trim it accordingly
	drbrownserv.alert = function( inString ) {
		if ( inString.length > 200 ) {
			var s = inString.substring( 0, 100 );
			var e = inString.substring( inString.length - 100 );
			var a = s + "\n...\n" + e;
			alert( a );
		} else {
			alert( inString );
		}
	}

	// Shows the panel 
	// If the containing tab group is hidden, it is shown so the tabs of
	// other panels grouped with it may appear too. If it is minimized it
	// is considered hidden and gets unminimized.
	drbrownserv.showPanelByID = function ( panelID ) {
		var idshow = stringIDToTypeID( "show" );
		var desc = new ActionDescriptor();
		var idnull = charIDToTypeID( "null" );
			var ref = new ActionReference();
			var idPanel = stringIDToTypeID( "classPanel" );
			ref.putName( idPanel, panelID );
		desc.putReference( idnull, ref );
		executeAction( idshow, desc, DialogModes.NO );
	}
		

} // Overall try catch

catch (error) {
	// Debugging
	drbrownserv.alert (error + ":" + error.line);
}

// End of Dr. Brown's Services.jsx
