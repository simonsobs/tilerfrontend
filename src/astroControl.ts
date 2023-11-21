import { Control } from 'leaflet';

// A scale bar that shows arcsec / arcmin / degrees rather than meters.
// Taken verbatim from Imagine 

/* TODO: This control is actually kinda wrong. Probably to do with our projection */
export const AstroControl = Control.Scale.extend({
    options: {
        position: 'bottomright',
	    imperial: false,
	    maxWidth: 300,
    },
    _updateMetric: function (maxMeters) {
	    // meters -> arcsec
	    var maxArcsec = maxMeters / 30.87;
	    var maxUnit = maxArcsec;
	    var unitName = 'arcsec';

	    if (maxArcsec > 7200) {
	        // degrees
	        maxUnit /= 3600;
	        unitName = 'deg';
	    } else if (maxArcsec >= 180) {
	        // arcmin
	        maxUnit /= 60;
	        unitName = 'arcmin';
	    }
	    var unit = this._getRoundNum(maxUnit);
        var ratio = unit/maxUnit;
		this._mScale.style.width = Math.round(this.options.maxWidth * ratio) + 'px';
	    this._mScale.innerHTML = unit + ' ' + unitName;
    }
});