var kPluginDomain = "com.holtslander.jay.sketch-make-long-shadow"
var kPluginName = "Make Long Shadow";

var onRun = function(context) {
	// Check selection
	var selection = context.selection;
	if ([selection count] == 0) {
		showDialog("Please select something")
		return
	}

	// Create presets so we can remember the user's 
	// selection next time the plugin is run
	userDefaults = initDefaults({
		shadowDistance: 80,
		shadowDirection: "Bottom Right"
	})

	// All possible directions for the shadow
	var possibleDirections = [ "Bottom Right", "Bottom Left", "Top Right", "Top Left" ]
	
	// Ask for shadow details
	var alert = [COSAlertWindow new];
	[alert setMessageText: kPluginName];

	[alert addButtonWithTitle: 'Make Shadow'];
	[alert addButtonWithTitle: 'Cancel'];

	// Shadow Distance
	
	[alert addTextLabelWithValue: 'Distance'] // 0
	[alert addTextFieldWithValue: userDefaults.shadowDistance] // 1

	// Shadow Direction

	[alert addTextLabelWithValue: 'Direction'] // 2
	var indexOfLastSelectedDirection = possibleDirections.indexOf(userDefaults.shadowDirection+"")
	if(indexOfLastSelectedDirection == -1) indexOfLastSelectedDirection = 0
	var directionDropdown = createDropDown(possibleDirections, indexOfLastSelectedDirection, 140)
	[alert addAccessoryView: directionDropdown] // 3

	var distanceField = [alert viewAtIndex: 1];
	alert.alert().window().setInitialFirstResponder(distanceField);

	// Show config window and handle user's resposnse
	
	var response = [alert runModal]

	// Response will be "1000" if user clicked the 'Make Shadow' button
	
	if (response == "1000") {

		// Iterate through selected layers
		
		var doc = context.document,
			loop = [selection objectEnumerator],
			distance = parseInt([[alert viewAtIndex: 1] stringValue]),
			direction = [directionDropdown titleOfSelectedItem],
			xMultiplier = (direction == "Bottom Left" || direction == "Top Left") ? -1 : 1,
			yMultiplier = (direction == "Top Left" || direction == "Top Right") ? -1 : 1,
			unionAction = [[doc actionsController] actionWithID: "MSUnionAction"],
			flattenAction = [[doc actionsController] actionWithID: "MSFlattenAction"],
			groupAction = [[doc actionsController] actionWithID: "MSGroupAction"],
			shadowColor = hexToMSColor("#000000", 0.3),
			layer, originalLayer, firstLayerIndex, isTextLayer;

		while (originalLayer = [loop nextObject]) {
			
			// Only MSShapeGroups layers can be merged and flattened, 
			// so run the following only on MSShapeGroup layers

			isTextLayer = [originalLayer class] === MSTextLayer;

			if (isTextLayer) {
				layer = originalLayer.duplicate().layersByConvertingToOutlines().firstObject();
				firstLayerIndex = 0;
			} else {
				layer = originalLayer;
				firstLayerIndex = 1;
			}

			if ([layer class] === MSShapeGroup) {

				var i, duplicateLayer, layerOrigin, layerIndex, parentGroup;

				// Clear selection

				[[doc currentPage] deselectAllLayers]

				// Get the original layer's frame and parent

				layerOrigin = [[layer absoluteRect] origin]
				parentGroup = [layer parentGroup]
				

				// Duplicate layer to make shadow
				
				for (i = firstLayerIndex; i < distance; i++) {
					
					if (duplicateLayer == nil) {
						
						duplicateLayer = [layer duplicate]
						clearLayerStyles(duplicateLayer)
	        			[duplicateLayer select:true byExpandingSelection:false]

	        			// Flatten the first duplicate layer so that we don't create unnecessary sub paths
						if([duplicateLayer canFlatten] && [flattenAction validate]) {
							[flattenAction flatten:nil];
						}

					} else {
						duplicateLayer = [duplicateLayer duplicate]
						[duplicateLayer select:true byExpandingSelection:true]
					}
					
					// Position the duplicate layer 

					[[duplicateLayer absoluteRect] setX: layerOrigin.x + (xMultiplier * i)];
	        		[[duplicateLayer absoluteRect] setY: layerOrigin.y + (yMultiplier * i)];
				}

				// Merge all duplicates using Union

				if ([unionAction validate]) {
					[unionAction booleanUnion:nil] 
				}

				// Flatten the merged layer

				if ([flattenAction validate]) {
					[flattenAction flatten:nil]
				}

				// Get newly created Shadow Layer

				parentGroup = [layer parentGroup]
				layerIndex = [parentGroup indexOfLayer:layer]
				duplicateLayer = [parentGroup layerAtIndex:layerIndex+1]

				// Clean the shadow shape (remove extra path points)

				if(![duplicateLayer canFlatten]) {
					cleanShapePath([[duplicateLayer layers] firstObject], 1.2)
				}

				// Set shadow layer name and fill color

				[duplicateLayer setName:[layer name] + " Shadow"]

				[[duplicateLayer style] addStylePartOfType:0];
        		[[[duplicateLayer style] fill] setColor: shadowColor];

				// Move artwork layer above shadow layer

				[parentGroup removeLayer:originalLayer]
				[parentGroup insertLayers:[originalLayer] afterLayer:duplicateLayer]

				// Group artwork and shadow so they can be moved together

				[[doc currentPage] deselectAllLayers]
				[originalLayer select:true byExpandingSelection:true]
				[duplicateLayer select:true byExpandingSelection:true]

				if ([groupAction validate]) {
					[groupAction group:nil] 
				}
				[[[selection firstObject] parentGroup] setName:[layer name]]

			}

			// Clean up

			if (isTextLayer) {
				layer.removeFromParent();
			}
			duplicateLayer = nil

		}


		// Remember selected settings for next time

		userDefaults.shadowDistance = distance
		userDefaults.shadowDirection = direction
		saveDefaults(userDefaults)

	}
}


//--------------------------------------
//  Persisting information
//--------------------------------------

var initDefaults = function(initialValues) {

	var defaults = [[NSUserDefaults standardUserDefaults] objectForKey:kPluginDomain]
	var defaultValues = {}
    var dVal;

    for (var key in defaults) {
    	defaultValues[key] = defaults[key]
	}

	for (var key in initialValues) {
		dVal = defaultValues[key]
		if (dVal == nil) defaultValues[key] = initialValues[key]
	}

	return defaultValues
}

var saveDefaults = function(newValues) {
	if (kPluginDomain) {
		var defaults = [NSUserDefaults standardUserDefaults]
		[defaults setObject: newValues forKey: kPluginDomain];
	}
}

//--------------------------------------
//  Plugin UI
//--------------------------------------

var showDialog = function(message, title) {
	var app = [NSApplication sharedApplication],
		title = (typeof title !== 'undefined') ? title : kPluginName;
    [app displayDialog:message withTitle:title]
}

var createDropDown = function(items, selectedItemIndex, width) {
	var width = width || 300,
		selectedItemIndex = selectedItemIndex || 0,
		dropdownButton = [[NSPopUpButton alloc] initWithFrame: NSMakeRect(0, 0, width, 25) pullsDown:false];
	[dropdownButton addItemsWithTitles: items];
	[dropdownButton selectItemAtIndex: selectedItemIndex];
	return dropdownButton;
}

//--------------------------------------
//  Shapes and Styles
//--------------------------------------

var hexToMSColor = function(hex, alpha) {
	var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex),
		red = parseInt(result[1], 16) / 255,
		green = parseInt(result[2], 16) / 255,
		blue = parseInt(result[3], 16) / 255,
		alpha = (typeof alpha !== 'undefined') ? alpha : 1,
		color = [NSColor colorWithCalibratedRed:red green:green blue:blue alpha:alpha];
	return [MSColor colorWithNSColor:color]
}

var clearLayerStyles = function(layer) {
	var style = [layer style]
	[[style fills] removeAllObjects]
	[[style shadows] removeAllObjects]
	[[style innerShadows] removeAllObjects]
	[[style borders] removeAllObjects]
	
	[[style blur] setIsEnabled:false]
	[style setTextStyle:nil]
}


var cleanShapePath = function(shapePathLayer, threshold) {

	if(!shapePathLayer || [shapePathLayer class] !== MSShapePathLayer) return

	var shapeFrame = [shapePathLayer frame],
		shapeWidth = [shapeFrame width],
		shapeHeight = [shapeFrame height],
		shapePath = [shapePathLayer path],
		prevPoint = [shapePath firstPoint],
		point = [prevPoint point],
		prevCGPoint = CGPointMake(point.x*shapeWidth, point.y*shapeHeight),
		newPoints = [],
		count = [shapePath numberOfPoints],
		excludePrev = false,
		i, currPoint, currCGPoint;

	for(i = 1; i < count; ++i) {

		currPoint = [shapePath pointAtIndex:i]
		point = [currPoint point]
		currCGPoint = CGPointMake(point.x*shapeWidth, point.y*shapeHeight)
		
		if(Math.abs(prevCGPoint.x-currCGPoint.x) <= threshold && Math.abs(prevCGPoint.y-currCGPoint.y) <= threshold) {
			if(!excludePrev) {
				newPoints.push(prevPoint)
				excludePrev = true
			}
		} else {
			newPoints.push(prevPoint)
			if(excludePrev) excludePrev = false
		}
		
		prevPoint = currPoint
		prevCGPoint = currCGPoint
	}

	newPoints.push([shapePath lastPoint])

	var newShapePath = [MSShapePath pathWithPoints:newPoints]
	[newShapePath setIsClosed:true]
	shapePathLayer.path = newShapePath

}