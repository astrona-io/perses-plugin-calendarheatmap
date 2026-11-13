package model

import (
	"github.com/perses/shared/cue/common"
)

#percent: number & >=0 & <=100

kind: "CalendarHeatmapChart"
spec: close({
	// availability: SLA calendar (0..1 or 0..100). count: one number per day, coloured on a scale.
	mode: "availability" | "count"
	// What the availability query returns. errorRatio is turned into 1 - ratio. Default availability.
	valueType?: "availability" | "errorRatio"
	// Monthly availability target, percent. Days and months below it are breaches. Default 99.9.
	target?: #percent
	// Days at or above the target but below this are "close". Default 99.95; never below target.
	warnBelow?: #percent
	// months: month calendars side by side. year: one strip with a column per week. Default months.
	layout?: "months" | "year"
	// First column of each week. Default monday.
	weekStart?: "monday" | "sunday"
	// IANA zone ("Europe/Berlin"), "UTC" or "local". The dashboard's time zone when unset.
	timezone?: string & !=""
	// Link opened when a day is clicked instead of zooming the dashboard.
	// Variables: ${day} ${from} ${to}, plus dashboard variables.
	dayLink?: string & !=""
	// Count mode: theme palette the five steps are drawn from. Default success.
	colorScale?: "success" | "info" | "primary" | "warning" | "error"
	// Count mode: how a day's samples become one number. Default sum.
	reduce?: "sum" | "max" | "mean"
	// Count mode: how numbers are formatted.
	format?: common.#format
	// Incidents from an optional second query: every series with a value > 0 on a day is listed in
	// that day's tooltip.
	incidents?: close({
		// Label naming the incident; the series name when unset.
		label?: string & !=""
		// Link per incident. Variables: ${incident} ${day} ${from} ${to}, plus dashboard variables.
		link?: string & !=""
	})
})
