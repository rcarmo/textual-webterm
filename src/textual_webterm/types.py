from typing import NewType, Union

AppID = NewType("AppID", str)
Meta = dict[str, Union[str, None, int, bool]]
RouteKey = NewType("RouteKey", str)
SessionID = NewType("SessionID", str)
