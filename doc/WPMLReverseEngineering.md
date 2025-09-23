# Reverse engineering of WPML format

DJI Fly App uses the Waypoint Markup Language. It is not clear if the DJI Mini 4 Pro and other Mini models support the full WPML specification, as some parameters described in the references can't be selected from the GUI. 

The following procedure tries to understand the supported features used the following approach:

1. Generate a waypoint mission selecting different options for each waypoint and POI.
2. Export and check the generated XML.
3. Test if modifying the values manually in the XML and replacing the original one breaks the app or is accepted (for example, disable curved trajectories, which might be useful for orthomosaics).

## References

The first reference is a tutorial for standard users, and can give an idea of the supported options and how they map to the generated WPML. The others are specifications from Autel and DJI for drones that seem to support more features from the specification.

- [Introduction to Waypoint Flight Mode of DJI Fly](https://support.dji.com/help/content?customId=en-us03400007343&spaceId=34&re=US&lang=en&documentType=artical&paperDocType=paper)
- [Autel Robotics Cloud API - What is WPML](https://doc.autelrobotics.com/cloud_api/en/60/00/10/#what-is-wpml)
- [DJI Developer Cloud API - waylines.wpml](https://developer.dji.com/doc/cloud-api-tutorial/en/api-reference/dji-wpml/waylines-wpml.html)

## Sample mission definition

The following is a sample mission consisting of three points, all of altitude 120m AGL, looking at NADIR (-90°) and yaw pointing to N (°) or S (°). The actions are to take a photo and hover for 3s.

These parameters should be the base for future use to generate lawnmower patterns for orthomosaics.

~~~xml
<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:wpml="http://www.uav.com/wpmz/1.0.2">
  <Document>
    <wpml:missionConfig>
      <wpml:flyToWaylineMode>safely</wpml:flyToWaylineMode>
      <wpml:finishAction>goHome</wpml:finishAction>
      <wpml:exitOnRCLost>executeLostAction</wpml:exitOnRCLost>
      <wpml:executeRCLostAction>goBack</wpml:executeRCLostAction>
      <wpml:globalTransitionalSpeed>2.5</wpml:globalTransitionalSpeed>
      <wpml:droneInfo>
        <wpml:droneEnumValue>68</wpml:droneEnumValue>
        <wpml:droneSubEnumValue>0</wpml:droneSubEnumValue>
      </wpml:droneInfo>
    </wpml:missionConfig>
    <Folder>
      <wpml:templateId>0</wpml:templateId>
      <wpml:executeHeightMode>relativeToStartPoint</wpml:executeHeightMode>
      <wpml:waylineId>0</wpml:waylineId>
      <wpml:distance>0</wpml:distance>
      <wpml:duration>0</wpml:duration>
      <wpml:autoFlightSpeed>2.5</wpml:autoFlightSpeed>
      <Placemark>
        <Point>
          <coordinates>
            -71.2564659118652,-41.1292458553002
          </coordinates>
        </Point>
        <wpml:index>0</wpml:index>
        <wpml:executeHeight>120</wpml:executeHeight>
        <wpml:waypointSpeed>2.5</wpml:waypointSpeed>
        <wpml:waypointHeadingParam>
          <wpml:waypointHeadingMode>smoothTransition</wpml:waypointHeadingMode>
          <wpml:waypointHeadingAngle>0</wpml:waypointHeadingAngle>
          <wpml:waypointPoiPoint>0.000000,0.000000,0.000000</wpml:waypointPoiPoint>
          <wpml:waypointHeadingAngleEnable>1</wpml:waypointHeadingAngleEnable>
          <wpml:waypointHeadingPathMode>followBadArc</wpml:waypointHeadingPathMode>
          <wpml:waypointHeadingPoiIndex>0</wpml:waypointHeadingPoiIndex>
        </wpml:waypointHeadingParam>
        <wpml:waypointTurnParam>
          <wpml:waypointTurnMode>toPointAndStopWithContinuityCurvature</wpml:waypointTurnMode>
          <wpml:waypointTurnDampingDist>0</wpml:waypointTurnDampingDist>
        </wpml:waypointTurnParam>
        <wpml:useStraightLine>0</wpml:useStraightLine>
        <wpml:actionGroup>
          <wpml:actionGroupId>1</wpml:actionGroupId>
          <wpml:actionGroupStartIndex>0</wpml:actionGroupStartIndex>
          <wpml:actionGroupEndIndex>0</wpml:actionGroupEndIndex>
          <wpml:actionGroupMode>parallel</wpml:actionGroupMode>
          <wpml:actionTrigger>
            <wpml:actionTriggerType>reachPoint</wpml:actionTriggerType>
          </wpml:actionTrigger>
          <wpml:action>
            <wpml:actionId>1</wpml:actionId>
            <wpml:actionActuatorFunc>gimbalRotate</wpml:actionActuatorFunc>
            <wpml:actionActuatorFuncParam>
              <wpml:gimbalHeadingYawBase>aircraft</wpml:gimbalHeadingYawBase>
              <wpml:gimbalRotateMode>absoluteAngle</wpml:gimbalRotateMode>
              <wpml:gimbalPitchRotateEnable>1</wpml:gimbalPitchRotateEnable>
              <wpml:gimbalPitchRotateAngle>-90</wpml:gimbalPitchRotateAngle>
              <wpml:gimbalRollRotateEnable>0</wpml:gimbalRollRotateEnable>
              <wpml:gimbalRollRotateAngle>0</wpml:gimbalRollRotateAngle>
              <wpml:gimbalYawRotateEnable>0</wpml:gimbalYawRotateEnable>
              <wpml:gimbalYawRotateAngle>0</wpml:gimbalYawRotateAngle>
              <wpml:gimbalRotateTimeEnable>0</wpml:gimbalRotateTimeEnable>
              <wpml:gimbalRotateTime>0</wpml:gimbalRotateTime>
              <wpml:payloadPositionIndex>0</wpml:payloadPositionIndex>
            </wpml:actionActuatorFuncParam>
          </wpml:action>
          <wpml:action>
            <wpml:actionId>2</wpml:actionId>
            <wpml:actionActuatorFunc>hover</wpml:actionActuatorFunc>
            <wpml:actionActuatorFuncParam>
              <wpml:hoverTime>3</wpml:hoverTime>
            </wpml:actionActuatorFuncParam>
          </wpml:action>
        </wpml:actionGroup>
        <wpml:actionGroup>
          <wpml:actionGroupId>2</wpml:actionGroupId>
          <wpml:actionGroupStartIndex>0</wpml:actionGroupStartIndex>
          <wpml:actionGroupEndIndex>1</wpml:actionGroupEndIndex>
          <wpml:actionGroupMode>parallel</wpml:actionGroupMode>
          <wpml:actionTrigger>
            <wpml:actionTriggerType>reachPoint</wpml:actionTriggerType>
          </wpml:actionTrigger>
          <wpml:action>
            <wpml:actionId>4</wpml:actionId>
            <wpml:actionActuatorFunc>gimbalEvenlyRotate</wpml:actionActuatorFunc>
            <wpml:actionActuatorFuncParam>
              <wpml:gimbalPitchRotateAngle>-90</wpml:gimbalPitchRotateAngle>
              <wpml:gimbalRollRotateAngle>0</wpml:gimbalRollRotateAngle>
              <wpml:payloadPositionIndex>0</wpml:payloadPositionIndex>
            </wpml:actionActuatorFuncParam>
          </wpml:action>
        </wpml:actionGroup>
        <wpml:waypointGimbalHeadingParam>
          <wpml:waypointGimbalPitchAngle>0</wpml:waypointGimbalPitchAngle>
          <wpml:waypointGimbalYawAngle>0</wpml:waypointGimbalYawAngle>
        </wpml:waypointGimbalHeadingParam>
      </Placemark>
      <Placemark>
        <Point>
          <coordinates>
            -71.2554010748863,-41.1288857332968
          </coordinates>
        </Point>
        <wpml:index>1</wpml:index>
        <wpml:executeHeight>120</wpml:executeHeight>
        <wpml:waypointSpeed>2.5</wpml:waypointSpeed>
        <wpml:waypointHeadingParam>
          <wpml:waypointHeadingMode>smoothTransition</wpml:waypointHeadingMode>
          <wpml:waypointHeadingAngle>0</wpml:waypointHeadingAngle>
          <wpml:waypointPoiPoint>0.000000,0.000000,0.000000</wpml:waypointPoiPoint>
          <wpml:waypointHeadingAngleEnable>0</wpml:waypointHeadingAngleEnable>
          <wpml:waypointHeadingPathMode>followBadArc</wpml:waypointHeadingPathMode>
          <wpml:waypointHeadingPoiIndex>0</wpml:waypointHeadingPoiIndex>
        </wpml:waypointHeadingParam>
        <wpml:waypointTurnParam>
          <wpml:waypointTurnMode>toPointAndPassWithContinuityCurvature</wpml:waypointTurnMode>
          <wpml:waypointTurnDampingDist>0</wpml:waypointTurnDampingDist>
        </wpml:waypointTurnParam>
        <wpml:useStraightLine>0</wpml:useStraightLine>
        <wpml:actionGroup>
          <wpml:actionGroupId>1</wpml:actionGroupId>
          <wpml:actionGroupStartIndex>1</wpml:actionGroupStartIndex>
          <wpml:actionGroupEndIndex>1</wpml:actionGroupEndIndex>
          <wpml:actionGroupMode>parallel</wpml:actionGroupMode>
          <wpml:actionTrigger>
            <wpml:actionTriggerType>reachPoint</wpml:actionTriggerType>
          </wpml:actionTrigger>
          <wpml:action>
            <wpml:actionId>3</wpml:actionId>
            <wpml:actionActuatorFunc>takePhoto</wpml:actionActuatorFunc>
            <wpml:actionActuatorFuncParam>
              <wpml:payloadPositionIndex>0</wpml:payloadPositionIndex>
              <wpml:useGlobalPayloadLensIndex>0</wpml:useGlobalPayloadLensIndex>
            </wpml:actionActuatorFuncParam>
          </wpml:action>
          <wpml:action>
            <wpml:actionId>5</wpml:actionId>
            <wpml:actionActuatorFunc>hover</wpml:actionActuatorFunc>
            <wpml:actionActuatorFuncParam>
              <wpml:hoverTime>3</wpml:hoverTime>
            </wpml:actionActuatorFuncParam>
          </wpml:action>
        </wpml:actionGroup>
        <wpml:actionGroup>
          <wpml:actionGroupId>2</wpml:actionGroupId>
          <wpml:actionGroupStartIndex>1</wpml:actionGroupStartIndex>
          <wpml:actionGroupEndIndex>2</wpml:actionGroupEndIndex>
          <wpml:actionGroupMode>parallel</wpml:actionGroupMode>
          <wpml:actionTrigger>
            <wpml:actionTriggerType>reachPoint</wpml:actionTriggerType>
          </wpml:actionTrigger>
          <wpml:action>
            <wpml:actionId>6</wpml:actionId>
            <wpml:actionActuatorFunc>gimbalEvenlyRotate</wpml:actionActuatorFunc>
            <wpml:actionActuatorFuncParam>
              <wpml:gimbalPitchRotateAngle>-90</wpml:gimbalPitchRotateAngle>
              <wpml:gimbalRollRotateAngle>0</wpml:gimbalRollRotateAngle>
              <wpml:payloadPositionIndex>0</wpml:payloadPositionIndex>
            </wpml:actionActuatorFuncParam>
          </wpml:action>
        </wpml:actionGroup>
        <wpml:waypointGimbalHeadingParam>
          <wpml:waypointGimbalPitchAngle>0</wpml:waypointGimbalPitchAngle>
          <wpml:waypointGimbalYawAngle>0</wpml:waypointGimbalYawAngle>
        </wpml:waypointGimbalHeadingParam>
      </Placemark>
      <Placemark>
        <Point>
          <coordinates>
            -71.2541893869638,-41.1284518669958
          </coordinates>
        </Point>
        <wpml:index>2</wpml:index>
        <wpml:executeHeight>120</wpml:executeHeight>
        <wpml:waypointSpeed>2.5</wpml:waypointSpeed>
        <wpml:waypointHeadingParam>
          <wpml:waypointHeadingMode>smoothTransition</wpml:waypointHeadingMode>
          <wpml:waypointHeadingAngle>-180</wpml:waypointHeadingAngle>
          <wpml:waypointPoiPoint>0.000000,0.000000,0.000000</wpml:waypointPoiPoint>
          <wpml:waypointHeadingAngleEnable>1</wpml:waypointHeadingAngleEnable>
          <wpml:waypointHeadingPathMode>followBadArc</wpml:waypointHeadingPathMode>
          <wpml:waypointHeadingPoiIndex>0</wpml:waypointHeadingPoiIndex>
        </wpml:waypointHeadingParam>
        <wpml:waypointTurnParam>
          <wpml:waypointTurnMode>toPointAndStopWithContinuityCurvature</wpml:waypointTurnMode>
          <wpml:waypointTurnDampingDist>0</wpml:waypointTurnDampingDist>
        </wpml:waypointTurnParam>
        <wpml:useStraightLine>0</wpml:useStraightLine>
        <wpml:actionGroup>
          <wpml:actionGroupId>1</wpml:actionGroupId>
          <wpml:actionGroupStartIndex>2</wpml:actionGroupStartIndex>
          <wpml:actionGroupEndIndex>2</wpml:actionGroupEndIndex>
          <wpml:actionGroupMode>parallel</wpml:actionGroupMode>
          <wpml:actionTrigger>
            <wpml:actionTriggerType>reachPoint</wpml:actionTriggerType>
          </wpml:actionTrigger>
          <wpml:action>
            <wpml:actionId>7</wpml:actionId>
            <wpml:actionActuatorFunc>hover</wpml:actionActuatorFunc>
            <wpml:actionActuatorFuncParam>
              <wpml:hoverTime>3</wpml:hoverTime>
            </wpml:actionActuatorFuncParam>
          </wpml:action>
        </wpml:actionGroup>
        <wpml:waypointGimbalHeadingParam>
          <wpml:waypointGimbalPitchAngle>0</wpml:waypointGimbalPitchAngle>
          <wpml:waypointGimbalYawAngle>0</wpml:waypointGimbalYawAngle>
        </wpml:waypointGimbalHeadingParam>
      </Placemark>
    </Folder>
  </Document>
</kml>
~~~


## Analysis of the generated WPML - Waypoints (aka Placemarks)

According to the tutorial, placemarks can contain these following values. Values of interest for this analysis are tagged with (relevant).

- Coordinates (relevant)
- Altitude (relevant)
- Speed
    - Global Speed (relevant)
    - Custom
- Heading
    - Follow Course
    - POI
    - Custom (relevant)
    - Manual
- Gymbal Tilt
    - POI
    - Custom (relevant)
    - Manual
- Zoom
    - Auto
    - Digital
    - Manual
- Hover  (relevant)   
    - Interval in seconds (0 is none)
- Camera action:
    - Take Photo (relevant)
    - Start Recording
    - Stop Recording.    


## wayilines.wpml Placemark template

The following template for placemarks could be copied substituting the relevant fields, to generate trajectories.

~~~xml
<Placemark>
  <Point>
    <coordinates>{LON},{LAT}</coordinates> <!-- KML order: lon,lat -->
  </Point>

  <wpml:index>{IDX}</wpml:index>
  <wpml:executeHeight>{ALT_M}</wpml:executeHeight>         <!-- e.g., 120 -->
  <wpml:waypointSpeed>{SPEED_MPS}</wpml:waypointSpeed>     <!-- e.g., 2.5 -->

  <wpml:waypointHeadingParam>
    <wpml:waypointHeadingMode>smoothTransition</wpml:waypointHeadingMode>
    <wpml:waypointHeadingAngle>{HEADING_DEG}</wpml:waypointHeadingAngle>        <!-- e.g., 0 -->
    <wpml:waypointPoiPoint>0.000000,0.000000,0.000000</wpml:waypointPoiPoint>
    <wpml:waypointHeadingAngleEnable>1</wpml:waypointHeadingAngleEnable>        <!-- **fixed** -->
    <wpml:waypointHeadingPathMode>followBadArc</wpml:waypointHeadingPathMode>
    <wpml:waypointHeadingPoiIndex>0</wpml:waypointHeadingPoiIndex>
  </wpml:waypointHeadingParam>

  <wpml:waypointTurnParam>
    <wpml:waypointTurnMode>toPointAndStopWithContinuityCurvature</wpml:waypointTurnMode>  <!-- **fixed** -->
    <wpml:waypointTurnDampingDist>0</wpml:waypointTurnDampingDist>
  </wpml:waypointTurnParam>

  <wpml:useStraightLine>0</wpml:useStraightLine>

  <!-- Action Group 1: at this waypoint, gimbal to -90, take photo, hover 3s -->
  <wpml:actionGroup>
    <wpml:actionGroupId>1</wpml:actionGroupId>
    <wpml:actionGroupStartIndex>{IDX}</wpml:actionGroupStartIndex>
    <wpml:actionGroupEndIndex>{IDX}</wpml:actionGroupEndIndex>
    <wpml:actionGroupMode>parallel</wpml:actionGroupMode>
    <wpml:actionTrigger>
      <wpml:actionTriggerType>reachPoint</wpml:actionTriggerType>
    </wpml:actionTrigger>

    <!-- gimbalRotate: absolute pitch -90 -->
    <wpml:action>
      <wpml:actionId>{ACT_ID_GIMBAL}</wpml:actionId>
      <wpml:actionActuatorFunc>gimbalRotate</wpml:actionActuatorFunc>
      <wpml:actionActuatorFuncParam>
        <wpml:gimbalHeadingYawBase>aircraft</wpml:gimbalHeadingYawBase>
        <wpml:gimbalRotateMode>absoluteAngle</wpml:gimbalRotateMode>
        <wpml:gimbalPitchRotateEnable>1</wpml:gimbalPitchRotateEnable>
        <wpml:gimbalPitchRotateAngle>-90</wpml:gimbalPitchRotateAngle>
        <wpml:gimbalRollRotateEnable>0</wpml:gimbalRollRotateEnable>
        <wpml:gimbalRollRotateAngle>0</wpml:gimbalRollRotateAngle>
        <wpml:gimbalYawRotateEnable>0</wpml:gimbalYawRotateEnable>
        <wpml:gimbalYawRotateAngle>0</wpml:gimbalYawRotateAngle>
        <wpml:gimbalRotateTimeEnable>0</wpml:gimbalRotateTimeEnable>
        <wpml:gimbalRotateTime>0</wpml:gimbalRotateTime>
        <wpml:payloadPositionIndex>0</wpml:payloadPositionIndex>
      </wpml:actionActuatorFuncParam>
    </wpml:action>

    <!-- takePhoto -->
    <wpml:action>
      <wpml:actionId>{ACT_ID_PHOTO}</wpml:actionId>
      <wpml:actionActuatorFunc>takePhoto</wpml:actionActuatorFunc>
      <wpml:actionActuatorFuncParam>
        <wpml:payloadPositionIndex>0</wpml:payloadPositionIndex>
        <wpml:useGlobalPayloadLensIndex>0</wpml:useGlobalPayloadLensIndex>
      </wpml:actionActuatorFuncParam>
    </wpml:action>

    <!-- hover 3s -->
    <wpml:action>
      <wpml:actionId>{ACT_ID_HOVER}</wpml:actionId>
      <wpml:actionActuatorFunc>hover</wpml:actionActuatorFunc>
      <wpml:actionActuatorFuncParam>
        <wpml:hoverTime>3</wpml:hoverTime>
      </wpml:actionActuatorFuncParam>
    </wpml:action>
  </wpml:actionGroup>

  <!-- Keep this neutral; the app tends to retain it -->
  <wpml:waypointGimbalHeadingParam>
    <wpml:waypointGimbalPitchAngle>0</wpml:waypointGimbalPitchAngle>
    <wpml:waypointGimbalYawAngle>0</wpml:waypointGimbalYawAngle>
  </wpml:waypointGimbalHeadingParam>
</Placemark>
~~~

## Issues

It is not yet clear how DJI Go handles indexes, and action for Placemark 0 seems to be ignored. This is under review.