import os
import shutil
import time
import threading
import logging



class cacheCleaner:

    

    def __init__(self, cached_items , cache_root : set, low_watermark : int = None, high_watermark : int = None) :
        self.logger = logging.getLogger(__name__)
        if low_watermark is None:
            low_watermark = 5 #Cache cleaner will trigger when 5Gb of space remains on the cache volume.
        if high_watermark is None: #Once triggered Cache Cleaner will stop removing files when there is 15GB of free space.
            high_watermark = 15
        self.cacheProcessor = threading.Thread(target=self.chekAndClean, args=(cached_items,cache_root, low_watermark*1024, high_watermark*1024))
        self.cacheProcessor.start()
    

    def chekAndClean(self, cached_items : set, cache_root, low_watermark , high_watermark):
        while(True):
            try: 
                freespace = self.getFreeSpace(cache_root)
                while(freespace < low_watermark) :
                    self.logger.warning("Low watermark reached. Starting clean-up.")
                    paths = sorted( [x[0] for x in os.walk(cache_root)], key=os.path.getctime)
                    path=paths[1] # [0] is the cache root itself.
                    for path in paths:
                        try:
                            for file in os.listdir(path):
                                # check only text files
                                if file.endswith('.cache'):
                                    try:
                                        try:
                                            cached_items.remove(os.path.join(path[len(cache_root)+1:],file[:-6]))
                                        except:
                                            pass #entry is not in the cache ( could be the case if the service has rebooted)
                                        os.remove(os.path.join(path,file))
                                    except Exception as err:
                                        print(err)
                            try:
                                os.removedirs(path)
                            except:
                                pass #some files could have spawned in the folder in-between, unlikely...
                        except Exception as err:
                            print(err)
                        if (self.getFreeSpace(cache_root) >  high_watermark) :
                            self.logger.warning("High watermark reached. stoping clean-up.")
                            break 
                    freespace = self.getFreeSpace(cache_root)
                time.sleep(5)
            except:
                #catching the thread if it falls
                self.logger.error("Cache Cleaner thread encountered an issue and will be restored in 5 seconds.")
                time.sleep(5)
                self.chekAndClean(cached_items , cache_root, low_watermark , high_watermark)

    def getFreeSpace(self, directory):
        stat = shutil.disk_usage(directory)
        freeMB = stat.free/1024/1024 # get us the value in MBytes.
        return freeMB