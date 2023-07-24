import os
import shutil
from threading import Thread
import time

class StorageMonitor:

    keeprunning = True
    def __init__(self,  directory , space_limit_for_throttle , space_limit_for_oor , ) -> None:

            self.directory = directory
            self.space_limit_for_throttle = space_limit_for_throttle
            self.space_limit_for_oor = space_limit_for_oor
            monitorThread =  Thread(target=self.monitorSpace , args = ())
            monitorThread.start()

    def __del__(self):
        self.keeprunning = False

    def monitorSpace(self):
        while(self.keeprunning):

            stat = shutil.disk_usage(self.directory)
            # Print disk usage statistics
            freeMB = stat.free/1024/1024 # get us the value in MBytes.
            if( freeMB < self.space_limit_for_throttle):
                self.throttleReached = True
            else:
                self.throttleReached = False
            if( freeMB < self.space_limit_for_oor):
                self.oorReached = True
            else:
                self.oorReached = False                
            time.sleep(1)

    def setSpaceLimitforThrottle(self,space_limit_for_throttle ):
        self.space_limit_for_throttle = space_limit_for_throttle

    def setSpaceLimitforOfr(self,space_limit_for_orr ):
        self.space_limit_for_orr = space_limit_for_orr

    def getThrottleStatus(self):
        return self.throttleReached
    
    def getOutOfResourceStatus(self):
        return self.oorReached