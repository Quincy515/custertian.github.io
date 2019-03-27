---
layout: post
title: "5.k8s部署-多Master集群"
date: 2019-03-27 00:55:58
image: '/assets/img/'
description: 'k8s部署第五步-多Master集群'
tags:
- kubernetes
- node
categories:
- kubernetes
twitter_text: 'k8s部署第五步-多Master集群'
---
# 5. k8s部署-多Master集群

#### [Part 1: 多Master集群架构分析](#part1)

#### [Part 2: keepalived和nginx做负载均衡](#part2)

#### [Part 3: 增加Master节点](#part3)

#### [Part 4: 修改Node加入多Master集群](#part4)

#### [Part 5: kubectl远程连接K8S集群](#part5)

#### [Part 6: WebUI(Dashboard)部署](#part6)

#### [kubernetes二进制部署系列](#serial)

### <a name="part1"></a>1. 多Master集群架构分析

![5.png](https://cdn.nlark.com/yuque/0/2019/png/288708/1553602789312-f418980f-9276-4990-9f85-8b3805096b35.png#align=left&display=inline&height=262&name=5.png&originHeight=522&originWidth=1485&size=42432&status=done&width=746)

多 **Master **集群架构主要是给 **apiserver **做负载均衡

**scheduler **和 **controller-manager **内部是基于 **etcd **实现的高可用

在我们部署时可以看到配置文件中

```bash
[k8s@k8s-master01 ~]$ cat /opt/kubernetes/cfg/kube-controller-manager 

KUBE_CONTROLLER_MANAGER_OPTS="--logtostderr=false \
--log-dir=/opt/kubernetes/logs \
--v=4 \
--master=127.0.0.1:8080 \
--leader-elect=true \
--address=127.0.0.1 \
--service-cluster-ip-range=10.0.0.0/24 \
--cluster-name=kubernetes \
--cluster-signing-cert-file=/opt/kubernetes/ssl/ca.pem \
--cluster-signing-key-file=/opt/kubernetes/ssl/ca-key.pem  \
--root-ca-file=/opt/kubernetes/ssl/ca.pem \
--service-account-private-key-file=/opt/kubernetes/ssl/ca-key.pem \
--experimental-cluster-signing-duration=87600h0m0s"
```

`--leader-elect=true`: 启用 etcd 的选举工作

我们只需要增加**LoadBalancer**给 **apiserver** 做高可用，**Node**的请求通过**LoadBalancer**

| 主机名 | 名称 | ip地址 | 用户名 | 密码 | 角色 | 组件 |
| --- | --- | --- | --- | --- | --- | --- |
| k8s-master01 | k8s-centos-1 | 10.211.55.10 | k8s | Root1234 | master1 | kube-apiserver<br />kuber-controller-manager<br />kuber-scheduler<br />etcd |
| k8s-master02 | k8s-centos-11 | 10.211.55.11 | k8s | Root1234 | master2 | kube-apiserver<br />kuber-controller-manager<br />kuber-scheduler<br />etcd |
| k8s-node01 | k8s-centos-12 | 10.211.55.12 | k8s | Root1234 | node1 | kubelet<br />kube-proxy<br />docker<br />flannel<br />etcd |
| k8s-node02 | k8s-centos-13 | 10.211.55.13 | k8s | Root1234 | node2 | kubelet<br />kube-proxy<br />docker<br />flannel<br />etcd |
|  | Load Balancer<br />(Master) | 10.211.55.14<br />(10.211.55.100)Virtual IP | nginx | Root1234 | Load Balancer<br />(Master) | Nginx L4 |
|  | Load Balancer<br />(Backup) | 10.211.55.15 | nginx | Root1234 | Load Balancer<br />(Backup) | Nginx L4 |
|  | Registry | 10.211.55.16 | cicd | Root1234 | master | Harbor<br />drone<br />gitea<br />docker |

### <a name="part2"></a>2. keepalived和nginx做负载均衡

这里我们使用**Nginx**来作为负载均衡，我们先用**keepalived**和**nginx**做好负载均衡的高可用

`sudo yum install -y keepalived nginx` 

如果yum源里没有nginx，可以先查看下 `sudo yum info nginx`

然后访问 [https://nginx.org/en/linux_packages.html#stable](https://nginx.org/en/linux_packages.html#stable)找到链接，安装

[https://nginx.org/packages/centos/7/x86_64/RPMS/](https://nginx.org/packages/centos/7/x86_64/RPMS/)

`uname-a` 查看内核和centos版本号

然后通过rpm 添加yum源

`sudo rpm -ivh http://nginx.org/packages/centos/7/noarch/RPMS/nginx-release-centos-7-0.el7.ngx.noarch.rpm`

接着使用<br /><br /><br />`sudo yum install -y nginx`

便可以解决依赖关系安装**nginx**，接着由于**nginx**安装完后不自动打开，<br />
<br />如果我们需要开启nginx同时以开机自动运行<br />
<br />`sudo systemctl start nginx.service`

`sudo systemctl enable nginx.service`

现在先不启动，先进行配置

安装好之后需要配置 **nginx，**`sudo vi /etc/nginx/nginx.conf` 

```yaml
user  nginx;
worker_processes  1;

error_log  /var/log/nginx/error.log warn;
pid        /var/run/nginx.pid;


events {
    worker_connections  1024;
}

######## 添加 stream,nginx的四层负载均衡通过ip+端口进行转发
stream {
		log_format main '$remote_addr $upstream_addr - [$time_local] $status $upstream_bytes_sent';
    access_log /var/log/nginx/k8s-access.log main;
    
    upstream k8s-apiserver {
    		server 10.211.55.10:6443;
        server 10.211.55.11:6443;
    }
    server {
    		listen 6443;
        proxy_pass k8s-apiserver;
    }
}
########


http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
                      '$status $body_bytes_sent "$http_referer" '
                      '"$http_user_agent" "$http_x_forwarded_for"';

    access_log  /var/log/nginx/access.log  main;

    sendfile        on;
    #tcp_nopush     on;

    keepalive_timeout  65;

    #gzip  on;

    include /etc/nginx/conf.d/*.conf;
}
```

在两个**Load Balancer**节点上添加下面的**stream**代码进行**ip**加端口的四层负载均衡

```bash
stream {
    log_format main '$remote_addr $upstream_addr - [$time_local] $status $upstream_bytes_sent';
    access_log /var/log/nginx/k8s-access.log main;
    
    upstream k8s-apiserver {
        server 10.211.55.10:6443;
        server 10.211.55.11:6443;
    }
    server {
        listen 6443;
        proxy_pass k8s-apiserver;
    }
}
```

配置好之后在两台**Load Balancer**节点上再进行启动 `sudo systemctl start nginx`  

然后可以在两台**Load Balancer**节点上配置 **keepalived** 

修改默认**keepalived**的配置文件_ _`sudo vi_ /etc/keepalived/keepalived.conf_`

```yaml
! Configuration File for keepalived 
 
global_defs { 
   notification_email { 
     acassen@firewall.loc 
     failover@firewall.loc 
     sysadmin@firewall.loc 
   } 
   notification_email_from Alexandre.Cassen@firewall.loc  
   smtp_server 127.0.0.1 
   smtp_connect_timeout 30 
   router_id NGINX_MASTER 
} 

vrrp_script check_nginx { # 检查nginx状态，确定是否转移IP绑定
    script "/etc/nginx/check_nginx.sh"
}

vrrp_instance VI_1 { 
    state MASTER 
    interface eth0 # 确定网卡是否是这个，注意修改，我的是eth0，不是ens32
    virtual_router_id 51 # VRRP 路由 ID实例，每个实例是唯一的 
    priority 100    # 优先级，备服务器设置 90 
    advert_int 1    # 指定VRRP 心跳包通告间隔时间，默认1秒 
    authentication { # 简单的认证信息
        auth_type PASS      
        auth_pass 1111 
    }  
    virtual_ipaddress { # 虚拟IP
        10.211.55.100/24 
    } 
    track_script { # 检查的脚本
        check_nginx
    } 
}
```

**keepalived**是一个双机热备的高可用软件，会有一个 **VIP** 就是 **Virtual IP** 虚拟 **IP** 地址

正常情况下是绑定在**Load Balancer Master** 上的，如果 **master **节点挂了之后会自动绑定到 **backup **上

`interface eth0`：确定`ifconfig`网卡是否是这个，注意修改，我的是eth0，不是ens32

`virtual_router_id`：VRRP 路由 ID实例，每个实例是唯一的

`priority`：优先级，备服务器设置 90 

`advert_int`：指定VRRP 心跳包通告间隔时间，默认1秒

`authentication`：简单的认证信息

`virtual_ipaddress`：虚拟IP

`track_script`：检查的脚本 `check_nginx`

所以我们也需要先写好这个检查**nginx**的脚本文件 `vi /etc/nginx/check_nginx.sh`

```shell
count=$(ps -ef |grep nginx |egrep -cv "grep|$$")

if [ "$count" -eq 0 ];then
    /etc/init.d/keepalived stop
fi
```

做好配置文件的准备之后，启动 **keepalived**，虚拟**IP**正常就会绑定到主机的**IP**上

`sudo systemctl start keepalived` 

查看 `ip address` 

```bash
[k8s@k8s-loadbalance-master ~]$ ip address
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
    inet6 ::1/128 scope host 
       valid_lft forever preferred_lft forever
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc pfifo_fast state UP group default qlen 1000
    link/ether 00:1c:42:53:6b:a6 brd ff:ff:ff:ff:ff:ff
    inet 10.211.55.14/24 brd 10.211.55.255 scope global noprefixroute dynamic eth0
       valid_lft 947sec preferred_lft 947sec
    inet 10.211.55.100/24 scope global secondary eth0
       valid_lft forever preferred_lft forever
    inet6 fdb2:2c26:f4e4:0:21c:42ff:fe53:6ba6/64 scope global noprefixroute dynamic 
       valid_lft 2591646sec preferred_lft 604446sec
    inet6 fe80::21c:42ff:fe53:6ba6/64 scope link noprefixroute 
       valid_lft forever preferred_lft forever
```

我们可以把 **keepalived **的配置文件拷贝到 **k8s-loadbalance-backup** 节点上

`sudo scp /etc/keepalived/keepalived.conf root@10.211.55.15:/etc/keepalived/`

我们需要在 **k8s-loadbalance-backup** 节点上修改 **keepalived **的配置文件

`sudo vi /etc/keepalived/keepalived.conf` 

```bash
! Configuration File for keepalived

global_defs {
   notification_email {
     acassen@firewall.loc
     failover@firewall.loc
     sysadmin@firewall.loc
   }
   notification_email_from Alexandre.Cassen@firewall.loc
   smtp_server 127.0.0.1
   smtp_connect_timeout 30
   router_id NGINX_MASTER
}

vrrp_script check_nginx {
    script "/etc/nginx/check_nginx.sh"
}

vrrp_instance VI_1 {
    state BACKUP
    interface eth0
    virtual_router_id 51 # VRRP 路由 ID实例，每个实例是唯一的
    priority 90    # 优先级，备服务器设置 90 
    advert_int 1    # 指定VRRP 心跳包通告间隔时间，默认1秒
    authentication {
        auth_type PASS
        auth_pass 1111
    }
    virtual_ipaddress {
        10.211.55.100/24
    }
    track_script {
        check_nginx
    }
}
```

`state`：状态需要修改为**BACKUP**<br />`priority`：优先级修改为**90**

然后把检查 **nginx** 的脚本也要拷贝过来

`sudo scp /etc/nginx/check_nginx.sh root@10.211.55.15:/etc/nginx/`

这样就可以启用 **keepalived** 了

```bash
[k8s@k8s-loadbalance-backup ~]$ sudo vi /etc/keepalived/keepalived.conf
[k8s@k8s-loadbalance-backup ~]$ cat /etc/nginx/check_nginx.sh 
count=$(ps -ef |grep nginx |egrep -cv "grep|$$")

if [ "$count" -eq 0 ];then
    /etc/init.d/keepalived stop
fi
[k8s@k8s-loadbalance-backup ~]$ sudo systemctl start keepalived
[k8s@k8s-loadbalance-backup ~]$ ps -ef | grep keep
root      5430     1  0 10:30 ?        00:00:00 /usr/sbin/keepalived -D
root      5431  5430  0 10:30 ?        00:00:00 /usr/sbin/keepalived -D
root      5432  5430  0 10:30 ?        00:00:00 /usr/sbin/keepalived -D
k8s       5450  5267  0 10:30 pts/2    00:00:00 grep --color=auto keep
[k8s@k8s-loadbalance-backup ~]$ ip address
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
    inet6 ::1/128 scope host 
       valid_lft forever preferred_lft forever
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc pfifo_fast state UP group default qlen 1000
    link/ether 00:1c:42:f2:c8:10 brd ff:ff:ff:ff:ff:ff
    inet 10.211.55.15/24 brd 10.211.55.255 scope global noprefixroute dynamic eth0
       valid_lft 1666sec preferred_lft 1666sec
    inet6 fdb2:2c26:f4e4:0:21c:42ff:fef2:c810/64 scope global noprefixroute dynamic 
       valid_lft 2591884sec preferred_lft 604684sec
    inet6 fe80::21c:42ff:fef2:c810/64 scope link noprefixroute 
       valid_lft forever preferred_lft forever
```

这样负载均衡就搭建好了

### <a name="part3"></a>3. 增加Master节点

只需要把**master01**节点的配置拷贝到**master02**节点，在修改下配置就可以

`sudo scp -r /opt/kubernetes/ root@10.211.55.11:/opt/`拷贝kubernetes工作目录包括工具和配置

`sudo scp -r /usr/lib/systemd/system/{kube-apiserver,kube-scheduler,kube-controller-manager}.service root@10.211.55.11:/usr/lib/systemd/system/`拷贝**systemd**的配置文件

`sudo scp /usr/bin/kubectl root@10.211.55.11:/usr/bin/` 拷贝**kubectl**集群命令台管理工具<br />接下来就可以在 master02节点上修改配置

`sudo scp -r /opt/etcd/ssl/ root@10.211.55.11:/opt/etcd/ssl/` **Master**主要连接的就是**etcd**，所以需要**etcd**证书

```bash
KUBE_APISERVER_OPTS="--logtostderr=false \
--log-dir=/opt/kubernetes/logs \
--v=4 \
--etcd-servers=https://10.211.55.10:2379,https://10.211.55.12:2379,https://10.211.55.13:2379 \
--bind-address=10.211.55.11 \
--secure-port=6443 \
--advertise-address=10.211.55.11 \
--allow-privileged=true \
--service-cluster-ip-range=10.0.0.0/24 \
--enable-admission-plugins=NamespaceLifecycle,LimitRanger,ServiceAccount,ResourceQuota,NodeRestriction \
--authorization-mode=RBAC,Node \
--kubelet-https=true \
--enable-bootstrap-token-auth \
--token-auth-file=/opt/kubernetes/cfg/token.csv \
--service-node-port-range=30000-50000 \
--tls-cert-file=/opt/kubernetes/ssl/server.pem  \
--tls-private-key-file=/opt/kubernetes/ssl/server-key.pem \
--client-ca-file=/opt/kubernetes/ssl/ca.pem \
--service-account-key-file=/opt/kubernetes/ssl/ca-key.pem \
--etcd-cafile=/opt/etcd/ssl/ca.pem \
--etcd-certfile=/opt/etcd/ssl/server.pem \
--etcd-keyfile=/opt/etcd/ssl/server-key.pem"
```

只需要把 `--advertise-address` 和 `--bind-address` 修改为当前的**master02**节点的**IP**地址

然后就可以启动 **Master** 组件的服务了

`sudo systemctl restart kube-apiserver`

`sudo systemctl restart kube-scheduler`

`sudo systemctl restart kube-controller-manager`

```bash
[k8s@k8s-master02 ~]$ sudo vim /opt/kubernetes/cfg/kube-apiserver 
[k8s@k8s-master02 ~]$ sudo systemctl restart kube-apiserver
[k8s@k8s-master02 ~]$ sudo systemctl restart kube-scheduler
[k8s@k8s-master02 ~]$ sudo systemctl restart kube-controller-manager
[k8s@k8s-master02 ~]$ ps -ef | grep kube
root      5223     1  7 10:23 ?        00:00:01 /opt/kubernetes/bin/kube-scheduler --logtostderr=false --log-dir=/opt/kubernetes/logs --v=4 --master=127.0.0.1:8080 --leader-elect
root      5240     1 15 10:23 ?        00:00:00 /opt/kubernetes/bin/kube-controller-manager --logtostderr=false --log-dir=/opt/kubernetes/logs --v=4 --master=127.0.0.1:8080 --leader-elect=true --address=127.0.0.1 --service-cluster-ip-range=10.0.0.0/24 --cluster-name=kubernetes --cluster-signing-cert-file=/opt/kubernetes/ssl/ca.pem --cluster-signing-key-file=/opt/kubernetes/ssl/ca-key.pem --root-ca-file=/opt/kubernetes/ssl/ca.pem --service-account-private-key-file=/opt/kubernetes/ssl/ca-key.pem --experimental-cluster-signing-duration=87600h0m0s
k8s       5248  4740  0 10:23 pts/1    00:00:00 grep --color=auto kube
```

我们也可以先手动**source**启动查看启动状况

`source /opt/kubernetes/cfg/kube-apiserver`

`sudo /opt/kubernetes/bin/kube-apiserver $KUBE_APISERVER_OPTS`

`journalctl -u kube-apiserver` 

先**stop**服务  `sudo systemctl stop kube-apiserver`

再重新手动启动查看报错 `sudo /opt/kubernetes/bin/kube-apiserver $KUBE_APISERVER_OPTS`

```bash
[k8s@k8s-master02 ~]$ sudo /opt/kubernetes/bin/kube-apiserver $KUBE_APISERVER_OPTS
F0326 10:42:33.942724    5445 storage_decorator.go:57] 
Unable to create storage backend: 
config (&{ /registry [https://10.211.55.10:2379 https://10.211.55.12:2379 https://10.211.55.13:2379] 
/opt/etcd/ssl/server-key.pem 
/opt/etcd/ssl/server.pem 
/opt/etcd/ssl/ca.pem true 0xc0007103f0 <nil> 5m0s 1m0s}), 
err (open /opt/etcd/ssl/server.pem: no such file or directory)
```

可以查看到具体的报错信息，如果解决了问题还是启动不起来，也有可能是时间问题，同步下互联网时间

`sudo ntpdate time.windows.com`

解决了问题，就可以使用**kubectl**管理集群了

```bash
[k8s@k8s-master02 ~]$ kubectl get node
NAME           STATUS   ROLES    AGE   VERSION
10.211.55.12   Ready    <none>   37h   v1.13.4
10.211.55.13   Ready    <none>   35h   v1.13.4
[k8s@k8s-master02 ~]$ kubectl get cs
NAME                 STATUS    MESSAGE             ERROR
scheduler            Healthy   ok                  
controller-manager   Healthy   ok                  
etcd-1               Healthy   {"health":"true"}   
etcd-2               Healthy   {"health":"true"}   
etcd-0               Healthy   {"health":"true"}   
[k8s@k8s-master02 ~]$ kubectl get pods
NAME                   READY   STATUS    RESTARTS   AGE
nginx-5c7588df-2bmzw   1/1     Running   0          34h
nginx-5c7588df-ljzp5   1/1     Running   0          34h
nginx-5c7588df-p9m5m   1/1     Running   0          34h
```

### <a name="part4"></a>4.修改Node加入多Master集群

之前的 **Node **节点是直接连接到 **单Master **的，现在有 **双Master **节点，并通过 **LoadBalancer **进行了 **虚拟IP **处理和 **keepalived **双机热备 

所以现在只需要把 **Node** 节点指向 **LoadBalancer**，主要修改连接的IP地址

_bootstrap.kubeconfig_ _flanneld_ _kubelet.kubeconfig_ _kube-proxy.kubeconfig _主要就是这几个文件 

`sudo vi /opt/kubernetes/cfg/bootstrap.kubeconfig` 

`sudo vi /opt/kubernetes/cfg/kubelet.kubeconfig` <br />
`sudo vi /opt/kubernetes/cfg/kube-proxy.kubeconfig` 

修改 `server: https://10.211.55.100:6443` 为 **loadbalancer** 的虚拟 IP<br /> <br />重启 **Node** 节点的 **kubelet、kube-proxy** 组件就可以

```bash
[k8s@k8s-node01 ~]$ sudo vi /opt/kubernetes/cfg/bootstrap.kubeconfig
[k8s@k8s-node01 ~]$ sudo vi /opt/kubernetes/cfg/kubelet.kubeconfig 
[k8s@k8s-node01 ~]$ sudo vi /opt/kubernetes/cfg/kube-proxy.kubeconfig  
[k8s@k8s-node01 ~]$ sudo systemctl restart kubelet
[k8s@k8s-node01 ~]$ sudo systemctl restart kube-proxy
```

`sudo tail /var/log/nginx/k8s-access.log` 查看 **loadbalancer **的访问日志

```bash
[k8s@k8s-loadbalance-master ~]$ sudo tail /var/log/nginx/k8s-access.log
10.211.55.12 10.211.55.11:6443 - [26/Mar/2019:13:11:33 -0400] 200 171
10.211.55.12 10.211.55.10:6443 - [26/Mar/2019:13:11:33 -0400] 200 171
```

所以**IP**为 **10.211.55.12** 的 **node01** 节点已经加入到 **多Master集群** 中了

现在可以为**node02**节点配置，也加入到 **多Master集群**

```bash
[k8s@k8s-node02 ~]$ sudo vi /opt/kubernetes/cfg/bootstrap.kubeconfig
[k8s@k8s-node02 ~]$ sudo vi /opt/kubernetes/cfg/kubelet.kubeconfig 
[k8s@k8s-node02 ~]$ sudo vi /opt/kubernetes/cfg/kube-proxy.kubeconfig  
[k8s@k8s-node02 ~]$ sudo systemctl restart kubelet
[k8s@k8s-node02 ~]$ sudo systemctl restart kube-proxy
```

再查看 **loadbalancer **的访问日志`sudo tail /var/log/nginx/k8s-access.log` 

```bash
[k8s@k8s-loadbalance-master ~]$ sudo tail /var/log/nginx/k8s-access.log
10.211.55.13 10.211.55.10:6443 - [26/Mar/2019:13:17:13 -0400] 200 171
10.211.55.13 10.211.55.11:6443 - [26/Mar/2019:13:17:13 -0400] 200 171
10.211.55.13 10.211.55.10:6443 - [26/Mar/2019:13:17:14 -0400] 200 171
10.211.55.13 10.211.55.11:6443 - [26/Mar/2019:13:17:14 -0400] 200 171
10.211.55.13 10.211.55.10:6443 - [26/Mar/2019:13:17:14 -0400] 200 171
10.211.55.12 10.211.55.11:6443 - [26/Mar/2019:13:17:14 -0400] 200 171
10.211.55.12 10.211.55.10:6443 - [26/Mar/2019:13:17:14 -0400] 200 171
10.211.55.12 10.211.55.11:6443 - [26/Mar/2019:13:17:14 -0400] 200 171
10.211.55.12 10.211.55.10:6443 - [26/Mar/2019:13:17:14 -0400] 200 171
10.211.55.12 10.211.55.11:6443 - [26/Mar/2019:13:17:14 -0400] 200 171
```

### <a name="part5"></a>5. kubectl远程连接K8S集群

我们先生成 **kubectl **远程连接的配置文件，与 **kubernetes **部署 **node **节点时创建 **kubeconfig **文件相似

因为所有的证书都在 **master01** 节点，所以我们现在该节点生成配置文件

```bash
[k8s@k8s-master01 k8s-cert]$ ls
admin.csr             ca-config.json  k8s-cert.sh          kube-proxy.kubeconfig  server.pem
admin-csr.json        ca.csr          kubeconfig.sh        kube-proxy.pem         token.csv
admin-key.pem         ca-csr.json     kube-proxy.csr       server.csr
admin.pem             ca-key.pem      kube-proxy-csr.json  server-csr.json
bootstrap.kubeconfig  ca.pem          kube-proxy-key.pem   server-key.pem
[k8s@k8s-master01 k8s-cert]$ vi kubelet.sh
```

这里要用到** admin.csr**，这个管理员的证书，所以我们在该目录下新建`vi kubelet.sh`脚本配置文件

```shell
kubectl config set-cluster kubernetes \
  --server=https://10.211.55.100:6443 \
  --embed-certs=true \
  --certificate-authority=ca.pem \
  --kubeconfig=config
kubectl config set-credentials cluster-admin \
  --certificate-authority=ca.pem \
  --embed-certs=true \
  --client-key=admin-key.pem \
  --client-certificate=admin.pem \
  --kubeconfig=config
kubectl config set-context default --cluster=kubernetes --user=cluster-admin --kubeconfig=config
kubectl config use-context default --kubeconfig=config
```

执行脚本文件生成证书 `bash kubelet.sh` 就生成一个 _config_ 文件

```bash
[k8s@k8s-master01 k8s-cert]$ bash kubelet.sh 
Cluster "kubernetes" set.
User "cluster-admin" set.
Context "default" created.
Switched to context "default".
[k8s@k8s-master01 k8s-cert]$ cat config 
apiVersion: v1
clusters:
- cluster:
    certificate-authority-data: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUR2akNDQXFhZ0F3SUJBZ0lVSG5uV0pCdmpFbXF1OUxjaVFrMVpkYy9td1BZd0RRWUpLb1pJaHZjTkFRRUwKQlFBd1pURUxNQWtHQTFVRUJoTUNRMDR4RURBT0JnTlZCQWdUQjBKbGFXcHBibWN4RURBT0JnTlZCQWNUQjBKbAphV3BwYm1jeEREQUtCZ05WQkFvVEEyczRjekVQTUEwR0ExVUVDeE1HVTNsemRHVnRNUk13RVFZRFZRUURFd3ByCmRXSmxjbTVsZEdWek1CNFhEVEU1TURNeU5ERTRNREF3TUZvWERUSTBNRE15TWpFNE1EQXdNRm93WlRFTE1Ba0cKQTFVRUJoTUNRMDR4RURBT0JnTlZCQWdUQjBKbGFXcHBibWN4RURBT0JnTlZCQWNUQjBKbGFXcHBibWN4RERBSwpCZ05WQkFvVEEyczRjekVQTUEwR0ExVUVDeE1HVTNsemRHVnRNUk13RVFZRFZRUURFd3ByZFdKbGNtNWxkR1Z6Ck1JSUJJakFOQmdrcWhraUc5dzBCQVFFRkFBT0NBUThBTUlJQkNnS0NBUUVBM1pmVTZiTHRzVVFKRnlodnNvbC8KaUhpSUd6dk9URDdXZ0twMnlKTXJzNUEyRVUwZEZSYUNJR0QvS3htT3V2RUhUbHJVOEZvY1BiYzdRUVFqZjh2cgpGbjBPTURtd1RuZmozcUpGSFNTUmN0TURhWjl1eFRpMy9qa2w1VFRDTWZtcXBCc2l3N2ZnOVpmOXpkVVo0Q3psCjF2TU9Odi8zVUZoZk5SQlhqR1hKaTFxakdIZnpuQ0lqVzMxZ1llK2hsYm0ySHlJeU5rUktmWTg4bjFHWG81YXAKWUtFdkJPa1pqVGlSQVNEendhRUMzM1UrNldCcStsTjdveGsybzBmVVlQak9VSm5TZU1ZdEQ4K1V6S1lhVnF4dwpwSWRna0RORXkxOGVQME1nR1drdEI5VW8wYVc2OWpXOW9GRlBvREZUdVFTR01aZ2RiUW0yTUYrT2pCU01wM0NIClNRSURBUUFCbzJZd1pEQU9CZ05WSFE4QkFmOEVCQU1DQVFZd0VnWURWUjBUQVFIL0JBZ3dCZ0VCL3dJQkFqQWQKQmdOVkhRNEVGZ1FVU2pqODg5TE13cmhOWUVZcWlucWg5dWJSUjhBd0h3WURWUjBqQkJnd0ZvQVVTamo4ODlMTQp3cmhOWUVZcWlucWg5dWJSUjhBd0RRWUpLb1pJaHZjTkFRRUxCUUFEZ2dFQkFKL1ltZmFOWU51NUI1T3ROV1BRCmUzU29uMXd2SVJOVHVkNlZ3ZmJTNHdnUXFwMmNVOFB0Unp1Vk5xMDNBZXpOZWFRSjJZZlFBaFdldTdjb2F6cDMKcVY2VG54RE04TWlmZngzQ05CQUliRVRoZE04STliVjJMc3RXNFcxQlR3K1BQNzFwenYyVUs4R0xTUjNMd0RYZQpLM2JpVnBJMkEydmZUVXh2WlFEYVFYa1lpSmdrcjNoVFVnd3FZQ0dNV0tMOFZ3ODJEUk5uNmdiZmRSVW4rWUkyCkFrUXZoYkhualVlYUVxYUhIbVZ1QWZJV2tRbXZNOHcwaW84dEdobkJpcFBNc245bExicEMvbUhiVkFhSE05QzAKTTFpTVN6MWNwQzNoOGdBYzhUNTlSSjJRbmtjVTM0KzdSd2dvWjg4M0FDWHRVVWs0OG51RHEzNzNuc0thZFBNUwpMTTg9Ci0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0K
    server: https://10.211.55.100:6443
  name: kubernetes
contexts:
- context:
    cluster: kubernetes
    user: cluster-admin
  name: default
current-context: default
kind: Config
preferences: {}
users:
- name: cluster-admin
  user:
    client-certificate-data: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUQzVENDQXNXZ0F3SUJBZ0lVZEV0QmJvUmJzUkFIcDgyQ3NyZWV6cVZ1OVdNd0RRWUpLb1pJaHZjTkFRRUwKQlFBd1pURUxNQWtHQTFVRUJoTUNRMDR4RURBT0JnTlZCQWdUQjBKbGFXcHBibWN4RURBT0JnTlZCQWNUQjBKbAphV3BwYm1jeEREQUtCZ05WQkFvVEEyczRjekVQTUEwR0ExVUVDeE1HVTNsemRHVnRNUk13RVFZRFZRUURFd3ByCmRXSmxjbTVsZEdWek1CNFhEVEU1TURNeU5ERTRNREF3TUZvWERUSTVNRE15TVRFNE1EQXdNRm93YXpFTE1Ba0cKQTFVRUJoTUNRMDR4RURBT0JnTlZCQWdUQjBKbGFVcHBibWN4RURBT0JnTlZCQWNUQjBKbGFVcHBibWN4RnpBVgpCZ05WQkFvVERuTjVjM1JsYlRwdFlYTjBaWEp6TVE4d0RRWURWUVFMRXdaVGVYTjBaVzB4RGpBTUJnTlZCQU1UCkJXRmtiV2x1TUlJQklqQU5CZ2txaGtpRzl3MEJBUUVGQUFPQ0FROEFNSUlCQ2dLQ0FRRUFzL3dpZTZ0WXJXRGUKSDRLZWdTcVFKVFloTVhWQ0pYcFZtcG5td2VBVVhpNlpFUk02SlZpNUFIaXlnWTNsL3hGRHlKbnJucUVaN1J2YwpNaFVLMzF5MUNrMURtb0xXa1VkbG1UY2RKaEpCRzJueXFKOVlkSVZGNjNWT0xNK2Q0OURDQVVpM2dPeThuWFFBCnc1UEZHQTU0Rjdva2R5OXRBbHJvY2cxbHQwVjBxRjgrSDA3c1N4NmdMSGk4cFcvc2lIMGkzMkhKMzhMZkJFZWMKcDZSWlFqdVVyRG5HRjgyTDVuTi9udXRTaE5pZWdNbkkvc3E0ajJLQUlta0dhWDc1Z0hRNnRHSHNMNkdtY2QyRQorZS84VUdvbFA5a1FDdndFaEdjd1UzWmRabE5uT2habkV0aThmSk5HdGNVaEdyQ0VWSFBaNEdXM3hRK28yeVBJClIyVTRHdjVzc1FJREFRQUJvMzh3ZlRBT0JnTlZIUThCQWY4RUJBTUNCYUF3SFFZRFZSMGxCQll3RkFZSUt3WUIKQlFVSEF3RUdDQ3NHQVFVRkJ3TUNNQXdHQTFVZEV3RUIvd1FDTUFBd0hRWURWUjBPQkJZRUZGSENpcCtWWjB6egovSXM4WGJjRnNocyt1L2ZUTUI4R0ExVWRJd1FZTUJhQUZFbzQvUFBTek1LNFRXQkdLb3A2b2ZibTBVZkFNQTBHCkNTcUdTSWIzRFFFQkN3VUFBNElCQVFEWDhFbm9YSEtKYTB2all3cVlhVXNNcjJIenNKRjlVWFlSVTBJL1J6QW0KNTJBTE5nYU5lSGtRL25Vb0p3N2xIUVhYNkJhcjNBMzJYTWV6QlZ3blNwOHp0bGFGdWsrSEt6ZjA4REdvTndqRApTcmpsQTFLeHpIOHJlb3lyWHFMZHZkWUdGbTJWa0NFVjN6cjlJL0JRTy9vMDd2NzRJTzNKWHh4Nit6OFUvdWtFCnExaGh0VjRqUE9abitkMjR6ZkNsVGlDb1BES0g4ZCtBbXk0Z25Sa2l5UTdRU01FbE8xTFBIUi82ZXNCWUJOcTAKSk1qVVJEQmJBWnFVa05XTmRvaVVxaHFUOXRXdUg4WXhOaWowWjdRbjdpSXlIM1VrUWRFcjEzVVdtZGpSN0xNdApCdmp3RFBCSkl2b0xmdHEraGVMV0NNMVVHNUNyS3Yyc0p5MlNteERSTVB0UAotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCg==
    client-key-data: LS0tLS1CRUdJTiBSU0EgUFJJVkFURSBLRVktLS0tLQpNSUlFcEFJQkFBS0NBUUVBcy93aWU2dFlyV0RlSDRLZWdTcVFKVFloTVhWQ0pYcFZtcG5td2VBVVhpNlpFUk02CkpWaTVBSGl5Z1kzbC94RkR5Sm5ybnFFWjdSdmNNaFVLMzF5MUNrMURtb0xXa1VkbG1UY2RKaEpCRzJueXFKOVkKZElWRjYzVk9MTStkNDlEQ0FVaTNnT3k4blhRQXc1UEZHQTU0Rjdva2R5OXRBbHJvY2cxbHQwVjBxRjgrSDA3cwpTeDZnTEhpOHBXL3NpSDBpMzJISjM4TGZCRWVjcDZSWlFqdVVyRG5HRjgyTDVuTi9udXRTaE5pZWdNbkkvc3E0CmoyS0FJbWtHYVg3NWdIUTZ0R0hzTDZHbWNkMkUrZS84VUdvbFA5a1FDdndFaEdjd1UzWmRabE5uT2habkV0aTgKZkpOR3RjVWhHckNFVkhQWjRHVzN4UStvMnlQSVIyVTRHdjVzc1FJREFRQUJBb0lCQUNSdFUwMVVVSTVHbks0ago4WkNTM0xtclN1eUhudXVXNXR4emFaQ3ptV3UyWXFSaUQ5S2ZNbEkyRzJxOUhWK1NUdlc2c1VWWnRiV1hmZWxrCitONWNGUWdRdXkzNmJSTGFNR1hpRWJReTNacCt4dTM1MGgxREcvT2J1a2EzZm0wdFF4YWZjUVJXNVpXNGRLOGcKcVRORk9ta1M4MjVyMnRRdk1meGpXY0xOKzk1WGtZSFB5MXVHeVlUYkRyVnkwM2YzeVpybDFqRDBldFNwY2Q2awpWalI0dW93Qk91YkgwRDZ1Nnd5ZmVBWHZNUG9kUXFDRWJlUytSZ3Q3Z3MvTkQ0a1RRcUJodlZ6M1ppeGxUVE9YClg5U243ZE5ta2tFY1d4Tm5FUGlwYVArMkNhVDR1TmI2M2JzUUROMklGRTd5SlgzY3RweG5qZjYwQ2Ruck1PQ2sKZjMzcjRBRUNnWUVBMjZNLysvZUJ3M2tCYTFZTDNHNHVETFdjNE95Smh4SEx4TFdiMEhjOGl0TGVnN2FuZ296bApFTGRjdlBueTIzZXVaVDYvRlk0K3ZFM2FKTGtTSTdQQkcxWHd3SENyVXBDc1FCbG12dkpkUkxjcFptMlBGcGZ1Citxak1za2Uxc2xiNHlDTXNNd3Z1OUdHU0lLWnNwV2I0TUtvM2crc0tHaEYzYTB4eXNad2N3dEVDZ1lFQTBjaE8KNm95elRyd0dPZFREN2UwQmk4UXV6ekFwWGZKbXQvdDhqVUZLR09PZzZvWW5JdHIyVUJ3bzVicFFlYXREbU9oYwo0aUh5ZE9XRExnMys2Y0RwUHhzSnc3UVA1ZDhlUHlXZXlrSnF0TVlOdlRyeGV3MTRieHdhV2JwRjB6OFlHc1hwCjVmZWlBY2I2dzN2Y1ZkRlcwNmFmQmxZZlZSU2RwQllFdmdpeXcrRUNnWUF4VHZnWllCcUF3TlRCdlNLU2pTWEgKY3FwU2tLZmJhL0pjS2cxZUFyYlR6NzFtd29YZXVEVGd5Tm1JRDNFbk5qb3Z2cU4xZW1hNUxaMHdxMS9ZSmczUApUajdyWlNBQlBEdC9kSFJ0bjhteW1KQXh6NXpWREt6NUZ4WkZXL1g5b0tyZmU0MzdzODBramhjWlAyT2F5b0FqCnBNTXIyWU4rRUxmSG5mVU56S2RrVVFLQmdRREVZSE5uWXlDeThwWU5hdHVpalB1bWY1YW1BdHFtaERTZHc4Q2IKWm1QYm1ySlcrQkFJczlwaHNZcWpTbDd0Rm1KbjhCU0s1dVpWZ1Vma1E5dTlyQVZzT241UWdlMWo3UkllWUxRZAplRUQxU25Vd0Q4NWZ0NE5tMTNMZlRkenhYQjNQYWplRE8rV2ZMa290MW5PeXJnMU9nYXBadnlNRGZSSDR1VmZsCklMVmZZUUtCZ1FDdHd4REhCNHpvY1VDSUVNQUdwME1naFlTYk9tSHBZQXlyNldScVovNXZQbzkwOE1kOGs4Y2cKeGNvVndvbHZIMElNWWs1ZXVBZWRpOWprNkpVeGRvWmFuZm0wUTJtMEtLNjBpYmZaOW9aTURrMFViQVkrbWVQdQpLWW44aXBqSGN1OFRGN05RTEtYbFBGdGlTaERTVTV6S2EwazdOZ1VyTVVKOUpLa1NIN1FOb3c9PQotLS0tLUVORCBSU0EgUFJJVkFURSBLRVktLS0tLQo=
[k8s@k8s-master01 k8s-cert]$ 
[5] 0:k8s@k8s-master01
```

使用这个**config**文件，我们可以在任意地方使用**kubectl**连接集群

我们尝试拷贝到** loadbalancer-backup** 节点

`sudo scp /usr/bin/kubectl root@10.211.55.15:/usr/bin/`

`scp config root@10.211.55.15:/home/k8s/`

```bash
[k8s@k8s-master01 k8s-cert]$ sudo scp /usr/bin/kubectl root@10.211.55.15:/usr/bin/ 
root@10.211.55.15's password: 
kubectl                                                           100%   37MB 118.1MB/s   00:00    
[k8s@k8s-master01 k8s-cert]$ scp config root@10.211.55.15:/home/k8s/
root@10.211.55.15's password: 
config                                                            100% 6275     5.5MB/s   00:00    
[k8s@k8s-loadbalance-backup ~]$ kubectl get pods
The connection to the server localhost:8080 was refused - did you specify the right host or port?
[k8s@k8s-loadbalance-backup ~]$ sudo kubectl --kubeconfig=./config get node
Unable to connect to the server: x509: certificate is valid for 
10.0.0.1, 127.0.0.1, 10.211.55.10, 10.211.55.11, 10.211.55.12, 10.211.55.13, 
10.211.55.14, 10.211.55.15, 10.211.55.16, 10.211.55.17, 10.211.55.18, 10.211.55.19,
10.211.55.20, not 10.211.55.100
```

所以生成证书的时候最好要把可能需要的所有IP都加上，添加证书后，或者修改虚拟IP之后就可以远程连接了

```bash
[k8s@k8s-loadbalance-backup ~]$ sudo kubectl --kubeconfig=./config get node
NAME           STATUS   ROLES    AGE    VERSION
10.211.55.12   Ready    <none>   9h     v1.13.4
10.211.55.13   Ready    <none>   7h7m   v1.13.4
```

**kubectl**只是一个客户端，是与 **apiserver** 连接的，如果在**master**执行，连接的是本地的 **apiserver**

### <a name="part6"></a>6.WebUI(Dashboard)部署

[https://github.com/kubernetes/kubernetes/tree/master/cluster/addons/dashboard](https://github.com/kubernetes/kubernetes/tree/master/cluster/addons/dashboard)

* 修改镜像：`registry.cn-hangzhou.aliyuncs.com/google_containers/kubernetes-dashboard-amd64:v1.10.0`
* 暴露外部：`NodePort`
* 创建登录`admin`账号登录

生产环境使用不多，查看日志容器状态

我们在**master01**节点创建` mkdir ui `目录来存放 **Dashboard** 的配置文件

我们把 **github** 下载的 文件到上传到 _ui_ 目录下

首先部署 **rbac** 角色控制管理 `vi dashboard-rbac.yaml`从官方下载不需要修改任何代码

部署起来 `kubectl apply -f dashboard-rbac.yaml`  

`kubectl apply -f dashboard-secret.yaml`

`kubectl apply -f dashboard-configmap.yaml`

```bash
[k8s@k8s-master01 ui]$ kubectl apply -f dashboard-rbac.yaml
role.rbac.authorization.k8s.io/kubernetes-dashboard-minimal created
rolebinding.rbac.authorization.k8s.io/kubernetes-dashboard-minimal created
[k8s@k8s-master01 ui]$ kubectl apply -f dashboard-secret.yaml
secret/kubernetes-dashboard-certs created
secret/kubernetes-dashboard-key-holder created
[k8s@k8s-master01 ui]$ kubectl apply -f dashboard-configmap.yaml
configmap/kubernetes-dashboard-settings created
[k8s@k8s-master01 ui]$ kubectl apply -f dashboard-controller.yaml 
serviceaccount/kubernetes-dashboard created
deployment.apps/kubernetes-dashboard created
[k8s@k8s-master01 ui]$ kubectl get pods -n kube-system
NAME                                    READY   STATUS              RESTARTS   AGE
kubernetes-dashboard-77fdb66558-4nkrf   0/1     ContainerCreating   0          <invalid>
[k8s@k8s-master01 ui]$ kubectl apply -f dashboard-service.yaml 
service/kubernetes-dashboard created 
```

然后修改 `vi dashboard-controller.yaml` 镜像的访问，默认是墙外的，可能会访问延迟

可以使用dockerhub上的镜像 `image: lizhenliang/kubernetes-dashboard-amd64:v1.10.1`

部署在了**kube-system**这个命名空间中，现在正在**ContainerCreating**拉取和创建容器

我们需要部署**service**暴露出**NodePort，** `vi dashboard-service.yaml` 

只需要修改` type: NodePort`，并固定端口，范围是30000-50000，所以我们固定为 `nodePort: 30001`

```bash
apiVersion: v1
kind: Service
metadata:
  name: kubernetes-dashboard
  namespace: kube-system
  labels:
    k8s-app: kubernetes-dashboard
    kubernetes.io/cluster-service: "true"
    addonmanager.kubernetes.io/mode: Reconcile
spec:
  type: NodePort
  selector:
    k8s-app: kubernetes-dashboard
  ports:
  - port: 443
    targetPort: 8443
    nodePort: 30001
```

因为默认部署在 **kube-system** 命名空间内，我们看下 **service**

**`kubectl get pods,svc -n kube-system`**

```bash
[k8s@k8s-master01 ui]$ kubectl get pods,svc -n kube-system         
NAME                                        READY   STATUS    RESTARTS   AGE
pod/kubernetes-dashboard-77fdb66558-4nkrf   1/1     Running   0          <invalid>

NAME                           TYPE       CLUSTER-IP   EXTERNAL-IP   PORT(S)         AGE
service/kubernetes-dashboard   NodePort   10.0.0.226   <none>        443:30001/TCP   78s
[k8s@k8s-master01 ui]$ 
```

现在访问 **node** **ip** 加上 端口 30001，使用**https**访问 [https://10.211.55.12:30001/](https://10.211.55.12:30001/#!/login)

登录需要使用 **token** 登录，所以需要创建一个 **admin** 账号，我们新建`vi k8s-admin.yaml`一个脚本来创建

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: dashboard-admin
  namespace: kube-system
---
kind: ClusterRoleBinding
apiVersion: rbac.authorization.k8s.io/v1beta1
metadata:
  name: dashboard-admin
subjects:
  - kind: ServiceAccount
    name: dashboard-admin
    namespace: kube-system
roleRef:
  kind: ClusterRole
  name: cluster-admin
  apiGroup: rbac.authorization.k8s.io
```

创建一个账户使用**token id**登录，执行 `kubectl apply -f k8s-admin.yaml`

执行之后我们查看下生成的token

`kubectl get secret -n kube-system` 找到刚生成的**NAME**<br />**<br />`kubectl describe secret dashboard-admin-token-*** -n kube-system` 查看token

```bash
[k8s@k8s-master01 ui]$ vim k8s-admin.yaml 
[k8s@k8s-master01 ui]$ kubectl apply -f k8s-admin.yaml
serviceaccount/dashboard-admin created
clusterrolebinding.rbac.authorization.k8s.io/dashboard-admin created
[k8s@k8s-master01 ui]$ kubectl get secret -n kube-system
NAME                               TYPE                                  DATA   AGE
dashboard-admin-token-qlddb        kubernetes.io/service-account-token   3      <invalid>
default-token-mwwgk                kubernetes.io/service-account-token   3      15h
kubernetes-dashboard-certs         Opaque                                0      22m
kubernetes-dashboard-key-holder    Opaque                                2      22m
kubernetes-dashboard-token-2gnr4   kubernetes.io/service-account-token   3      <invalid>
[k8s@k8s-master01 ui]$ kubectl describe secret dashboard-admin-token-qlddb -n kube-system
Name:         dashboard-admin-token-qlddb
Namespace:    kube-system
Labels:       <none>
Annotations:  kubernetes.io/service-account.name: dashboard-admin
              kubernetes.io/service-account.uid: a1bac419-4efa-11e9-bad1-001c42d2ed8e

Type:  kubernetes.io/service-account-token

Data
====
ca.crt:     1359 bytes
namespace:  11 bytes
token:      eyJhbGciOiJSUzI1NiIsImtpZCI6IiJ9.eyJpc3MiOiJrdWJlcm5ldGVzL3NlcnZpY2VhY2NvdW50Iiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9uYW1lc3BhY2UiOiJrdWJlLXN5c3RlbSIsImt1YmVybmV0ZXMuaW8vc2VydmljZWFjY291bnQvc2VjcmV0Lm5hbWUiOiJkYXNoYm9hcmQtYWRtaW4tdG9rZW4tcWxkZGIiLCJrdWJlcm5ldGVzLmlvL3NlcnZpY2VhY2NvdW50L3NlcnZpY2UtYWNjb3VudC5uYW1lIjoiZGFzaGJvYXJkLWFkbWluIiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9zZXJ2aWNlLWFjY291bnQudWlkIjoiYTFiYWM0MTktNGVmYS0xMWU5LWJhZDEtMDAxYzQyZDJlZDhlIiwic3ViIjoic3lzdGVtOnNlcnZpY2VhY2NvdW50Omt1YmUtc3lzdGVtOmRhc2hib2FyZC1hZG1pbiJ9.nUf4-kSuiAh8yexmifuWYCpTrBFyUd4dRkj_f6L4Xe3qHJ_hUe9Yg251e4HIKXa9w6n_K900AbWzzirSNI0UP_EGbU7CFhb3UO7HSfzeXY6iYoHkA30q7uVkL2p28dLpi3OBPsMGk6CrMcbHEHbo7He8hF4_vMFNLom6u3SzAFTEADjrpDmsXD9YzwX96FJVhsfpRP_VqZ5gCgHcvr0ti_5WvF-uN11loNmS6siSEHDx2vZH2bB-u_SgipiZbjkJjUl37dahhn2GbK69vlK8JJXcfBCSEtCo4NOvFu8OfqLdayIxhwXLPvygRgDTvalNih6QTITVyXMYKvELFFvu8w
[k8s@k8s-master01 ui]$ 
```

我们复制token粘贴到网站上登录，就可以正常使用<br />
![6.png](https://cdn.nlark.com/yuque/0/2019/png/288708/1553680053081-6f4a7e1a-dee8-4975-b3a2-4f6e036e6786.png#align=left&display=inline&height=403&name=6.png&originHeight=1804&originWidth=3338&size=344708&status=done&width=746)

如果没有详细信息，显示站点过期或者不安全，无法通过高级等功能进入的话，我们可以选择手动生成证书

新建一个`vi dashboard-cert.sh `生成证书的脚本

```shell
cat > dashboard-csr.json <<EOF
{
    "CN": "Dashboard",
    "hosts": [],
    "key": {
        "algo": "rsa",
        "size": 2048
    },
    "names": [
        {
            "C": "CN",
            "L": "BeiJing",
            "ST": "BeiJing"
        }
    ]
}
EOF

K8S_CA=$1
cfssl gencert -ca=$K8S_CA/ca.pem -ca-key=$K8S_CA/ca-key.pem -config=$K8S_CA/ca-config.json -profile=kubernetes dashboard-csr.json | cfssljson -bare dashboard
kubectl delete secret kubernetes-dashboard-certs -n kube-system
kubectl create secret generic kubernetes-dashboard-certs --from-file=./ -n kube-system
```

K8S_CA证书的目录，生成证书并替换默认的证书即可

```bash
[k8s@k8s-master01 ui]$ bash dashboard-cert.sh /home/k8s/k8s/k8s-cert/
2019/03/25 09:02:52 [INFO] generate received request
2019/03/25 09:02:52 [INFO] received CSR
2019/03/25 09:02:52 [INFO] generating key: rsa-2048
2019/03/25 09:02:52 [INFO] encoded CSR
2019/03/25 09:02:52 [INFO] signed certificate with serial number 33568745200808060651724957115956530801072206867
2019/03/25 09:02:52 [WARNING] This certificate lacks a "hosts" field. This makes it unsuitable for
websites. For more information see the Baseline Requirements for the Issuance and Management
of Publicly-Trusted Certificates, v.1.1.6, from the CA/Browser Forum (https://cabforum.org);
specifically, section 10.2.3 ("Information Requirements").
secret "kubernetes-dashboard-certs" deleted
secret/kubernetes-dashboard-certs created
[k8s@k8s-master01 ui]$ 
```

创建成功之后就会生成两个证书 **dashboard-key.pem** 和 **dashboard.pem**<br />**<br />下一步需要在 **dashboard-controller.yaml** 文件中增加证书两行

```bash
    spec:
      priorityClassName: system-cluster-critical
      containers:
      - name: kubernetes-dashboard
        image: lizhenliang/kubernetes-dashboard-amd64:v1.10.1
        resources:
          limits:
            cpu: 100m
            memory: 300Mi
          requests:
            cpu: 50m
            memory: 100Mi
        ports:
        - containerPort: 8443
          protocol: TCP
        args:
          # PLATFORM-SPECIFIC ARGS HERE
          - --auto-generate-certificates
          - --tls-key-file=dashboard-key.pem
          - --tls-cert-file=dashboard.pem
```

然后重新 apply 就可以更新镜像`kubectl apply -f dashboard-controller.yaml`

可以查看到新的ui正在准备启动 `kubectl get pods -n kube-system -o wide`

### <a name="serial"></a>kubernetes二进制部署系列

1. [k8s部署-Etcd数据库集群部署](http://custer.me/etcd-bin-install/)
2. [k8s部署-Flannel网络](http://custer.me/flannel-bin-install/)
3. [k8s部署-Master组件](http://custer.me/kube-master/)
4. [k8s部署-Node组件](http://custer.me/kube-node/)
5. [k8s部署-多Master集群](http://custer.me/multi-master/)
