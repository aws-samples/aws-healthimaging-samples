import mysql.connector
import ssl
from mysql.connector import errorcode
from mysql.connector.constants import ClientFlag

class mysqlConnectionFactory(object):

  def __init__(self) -> None:
    pass

  def __new__(self, hostname : str, username : str , password : str , database : str) -> mysql.connector.MySQLConnection :
    config = {
        'user': username,
        'password': password,
        'host': hostname,
        'client_flags': [ClientFlag.SSL],
        'ssl_ca': '',
        'db': database
    }
    try:   
      cnx = mysql.connector.connect(**config)
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
      return cnx