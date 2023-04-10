FROM ubuntu:jammy

# build args
ARG DEBIAN_FRONTEND=noninteractive
ARG SCP_PORT
ARG STUNNEL_PORT

# environment:
ENV TZ=Etc/UTC

# Configure base OS and install packages
RUN apt-get update && apt-get -y install apt-utils tzdata stunnel supervisor python3 python3-pip
RUN pip install boto3 pydicom pynetdicom environs

WORKDIR /app

# configure supervisord
COPY supervisord.conf /etc/supervisor/supervisord.conf
COPY --chown=nobody:nogroup prefixlog.sh .
RUN chmod +x prefixlog.sh

# configure storescp
COPY --chown=nobody:nogroup storescp.py .
RUN chmod +x storescp.py

# configure stunnel, note that cert files may be missing.
COPY stunnel.conf cert.pe[m] cert.ke[y] /etc/stunnel/

# if SSL certificate and key are provided - use them. If not - generate a self-signed Demo pair
RUN if [ ! -s /etc/stunnel/cert.key -o ! -s /etc/stunnel/cert.pem ] ; then \
	openssl req -new -x509 -days 365 -nodes -subj '/CN=s3storescpDemo/O=s3StorescpDemo/C=US' -out /etc/stunnel/cert.pem -keyout /etc/stunnel/cert.key ;\
    fi 
   
RUN chmod go-rwx /etc/stunnel/cert.key
RUN sed -i "s/DOCKER_BUILD_SCP_PORT_PLACEHOLDER/${SCP_PORT}/g" /etc/stunnel/stunnel.conf
RUN sed -i "s/DOCKER_BUILD_STUNNEL_PORT_PLACEHOLDER/${STUNNEL_PORT}/g" /etc/stunnel/stunnel.conf

# set ownership of files
RUN chown -R nobody:nogroup /app /etc/stunnel

# Configure ports - storescp, stunnel -> storescp
EXPOSE ${SCP_PORT} ${STUNNEL_PORT}

# supervisord handles the stunnel and storescp processes
CMD ["/usr/bin/supervisord","-c","/etc/supervisor/supervisord.conf"]
