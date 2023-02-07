// Cornerstone
import cornerstone from 'cornerstone-core';
import cornerstoneMath from 'cornerstone-math';
import cornerstoneTools from 'cornerstone-tools';
import Hammer from 'hammerjs';

// CornerstoneTools init
cornerstoneTools.external.cornerstone = cornerstone;
cornerstoneTools.external.Hammer = Hammer;
cornerstoneTools.external.cornerstoneMath = cornerstoneMath;
cornerstoneTools.init();

export function useCornerstone() {
    function enableCornerstone(imageBoxElement, cornerstoneEventHandlers) {
        cornerstone.enable(imageBoxElement);
        cornerstoneTools.addTool(cornerstoneTools.StackScrollTool);
        cornerstoneTools.addTool(cornerstoneTools.ZoomTool);
        cornerstoneTools.addTool(cornerstoneTools.WwwcTool);
        cornerstoneTools.setToolActive('Wwwc', { mouseButtonMask: 2 });
        cornerstone.events.addEventListener(
            'cornerstoneimageloaded',
            cornerstoneEventHandlers.handleCornerstoneImageLoaded
        );
        cornerstone.events.addEventListener(
            'cornerstoneimageinvalidated',
            cornerstoneEventHandlers.handleCornerstoneImageInvalidated
        );
        imageBoxElement.addEventListener(
            'cornerstoneimagerendered',
            cornerstoneEventHandlers.handleImageBoxImageRendered
        );
    }

    function disableCornerstone(imageBoxElement, cornerstoneEventHandlers) {
        if (imageBoxElement) cornerstoneTools.stackPrefetch.disable(imageBoxElement);
        cornerstone.reset(imageBoxElement);
        cornerstone.disable(imageBoxElement);
        cornerstone.events.removeEventListener(
            'cornerstoneimageloaded',
            cornerstoneEventHandlers.handleCornerstoneImageLoaded
        );
        cornerstone.events.removeEventListener(
            'corenrstoneimageinvalidated',
            cornerstoneEventHandlers.handleCornerstoneImageInvalidated
        );
        imageBoxElement.removeEventListener(
            'cornerstoneimagerendered',
            cornerstoneEventHandlers.handleImageBoxImageRendered
        );
    }

    return {
        enableCornerstone,
        disableCornerstone,
    };
}
