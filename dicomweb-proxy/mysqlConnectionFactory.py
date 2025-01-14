import mysql.connector
import ssl
from mysql.connector import errorcode
from mysql.connector.constants import ClientFlag

class mysqlConnectionFactory(object):

  def __init__(self) -> None:
    pass

  def __new__(self, hostname : str, username : str , password : str , database : str , port : int , pool_size : int  = None , pool_name :str = None) -> mysql.connector.pooling  :
    config = {
        'user': username,
        'password': password,
        'host': hostname,
        'client_flags': [ClientFlag.SSL],
        'ssl_ca': '',
        'db': database, 
        'port': port
    }
    try:   
      if pool_size is None:
        pool_size = 32
      if pool_name is None:
        pool_name = "dicomweb-pool"
      mysql.connector.pooling.CNX_POOL_MAXSIZE = 200
      cnxpool = mysql.connector.pooling.MySQLConnectionPool(pool_name = pool_name,pool_size = pool_size,**config)
    except mysql.connector.Error as err:
      if err.errno == errorcode.ER_ACCESS_DENIED_ERROR:
        print("Something is wrong with your user name or password")
        return None
      elif err.errno == errorcode.ER_BAD_DB_ERROR:
        print("Database does not exist")
        return None
      else:
        print("error: "+str(err))
        return None
    else:
      return cnxpool