

var kPluginDomain = "com.holtslander.jay.sketch-make-long-shadow";
var kPluginName = ""

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

var setUndoGroupingEnabled = function(enabled) {
	var undoManager = [[doc currentView] undoManager];
    if(enabled) {
        [undoManager enableUndoCoalescing];
    } else {
        [undoManager disableUndoCoalescing];
    }
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