/** @jsx React.DOM */
(function(exports) {
'use strict';

// Widget to show monitors
var IndexBrowser = React.createClass({
  render: function() {
    return (
        <div>
        <div className='page-header'><h1>Taskcluster Index</h1></div>
        <p>This is a tool to browse the index of tasks.  Use it only for good.</p>
        <NamespaceSelector />
        <ComponentThatGoesPing />
        </div>
    );
  }
});

var NamespaceSelector = React.createClass({
  getInitialState: function() {
    return {
      result: null,
      selectedNamespace: null,
      error: null,
    }
  },
  clear: function() {
    this.replaceState(this.getInitialState());
  },
  error: function(error) {
    this.setState({error: error});
  },
  select: function(namespace) {
    this.setState({selectedNamespace: namespace});
  },
  render: function() {
    var result = ''; 
    if (this.state.error) {
      result = <ErrorBar error={this.state.error} />;
    } else if (this.state.selectedNamespace) {
      result = <TaskList namespace={this.state.selectedNamespace} />
    }
    return <div>
      <h2>Search for Namespace</h2>
      <NamespaceSearchEntry search={this.select} clear={this.clear} error={this.error} />  
      {result}
      </div>
  }
});

var ErrorBar = React.createClass({
  render: function() {
    return <div className='alert alert-danger'>
      <span className='glyphicon glyphicon-exclamation-sign'></span> 
      <strong>ERROR</strong> {this.props.error.message || this.props.error}
    </div>;
  }
});

var NamespaceInfo = React.createClass({
  render: function() {
    return <p>Information for namespace {this.props.namespace}</p>;
  }
});

var TaskList = React.createClass({
  getInitialState: function() {
    return {
      error: null,
      loading: true,
      tasks: []
    };
  },
  loadMore: function(props) {
    // Do task fetching here!

    // We need to handle the case where the properties of this component
    // are changing.  Instead of hacking things in componentWillReceiveProps
    // we'll intead decide whether we use a specified set of properties or
    // the nextProps object received in the hook
    var lProps = props || this.props;  
    console.log('Loading more tasks');
    this.setState({loading: true});
    var index = new window.taskcluster.index();
    var payload = {}
    if (this.state.continuationToken) {
      payload.continuationToken = this.state.continuationToken;
    }
    index.listTasks(lProps.namespace, payload)
      .then(function(result) {
        //console.log(JSON.stringify(result));
        this.setState({tasks: result.tasks, loading: false});
      }.bind(this))
      .then(null, function(error) {
        this.setState({loading: false, error: error});
      }.bind(this));
  },
  componentDidMount: function () {
    this.loadMore();
  },
  componentWillReceiveProps: function (nextProps) {
    this.replaceState(this.getInitialState());
    this.loadMore(nextProps);
  },
  reset: function () {
    console.log('Resetting tasks');
    this.replaceState(this.getInitialState());
    this.loadMore();
  },
  render: function() {
    var result;
    if (this.state.error) {
      result = <ErrorBar error={this.state.error} />;
    } else if (this.state.loading) {
      result = <div className='alert alert-info'><span className='glyphicon glyphicon-refresh'></span> Loading</div>;
    } else {
      result = <span>
        <div className='alert alert-info'>{this.props.namespace}</div>
        <TasksForNamespace tasks={this.state.tasks} />
        {this.state.continuationToken ? <LoadMoreTasksButton handler={this.loadMore} /> : ''}
      </span>;
    }
        
    return <div>{result}<ResetTasks handler={this.reset} /></div>;
  }
});

var LoadMoreTasksButton = React.createClass({
  render: function() {
    return <button className='btn btn-primary' onClick={this.props.handler}>Load More Tasks</button>;
  }
});

var ResetTasks = React.createClass({
  render: function() {
    return <button className='btn btn-default' onClick={this.props.handler}>Clear and Reload</button>;
  }
});

var TasksForNamespace = React.createClass({
  render: function() {
    var i = 0;
    return <div className='table-responsive'><table className='table table-hover table-striped'>
             <thead><tr><th>Namespace</th><th>ID</th><th>Rank</th><th>Data</th><th>Expires</th></tr></thead>
             <tbody>
             {
                this.props.tasks.map(function (t) {
                  return <TaskRow i={i++} key={t.namespace} task={t} />;
                }, this)
             }
             </tbody>
           </table></div>;
  }
});

var TaskRow = React.createClass({
  render: function() {
    var t = this.props.task;
    return <tr>
             <td>{t.namespace}</td>
             <td>{t.taskId}</td>
             <td>{t.rank}</td>
             <td><DataDisplay i={this.props.i} namespace={t.namespace} data={t.data} /></td>
             <td>{t.expires}</td>
           </tr>;
  }
});

var DataDisplay = React.createClass({
  render: function() {
    /* Ideally, we'd use the namespace here, but 
       having the periods in the namespace name
       seems to mess with the modal
     */
    //var id = 'data-modal-' + data.props.namespace;
    var id = 'data-modal-' + this.props.i;
    var hashId = '#' + id;
    var lblId = id + '-label';
    return <div>
<button className="btn btn-default" data-toggle="modal" data-target={hashId}>
  Show Data
</button>

<div className="modal fade" id={id} tabIndex="-1" role="dialog" aria-labelledby={lblId} aria-hidden="true">
  <div className="modal-dialog">
    <div className="modal-content">
      <div className="modal-header">
        <button type="button" className="close" data-dismiss="modal"><span aria-hidden="true">&times;</span><span className="sr-only">Close</span></button>
        <h4 className="modal-title" id="myModalLabel">Modal title</h4>
      </div>
      <div className="modal-body">
{JSON.stringify(this.props.data)} {this.props.i}
      </div>
      <div className="modal-footer">
        <button type="button" className="btn btn-default" data-dismiss="modal">Close</button>
        <button type="button" className="btn btn-primary">Save changes</button>
      </div>
    </div>
  </div>
</div>




    </div>
  }
});

var NamespaceSearchEntry = React.createClass({
  getInitialState: function(){
    return {
      text: '',
    }
  },
  clear: function(e) {
    e.preventDefault();
    this.replaceState(this.getInitialState());
    this.props.clear();
  },
  search: function(e) {
    e.preventDefault();
    if (this.state.text === '') {
      this.props.error('To do a search you must enter search terms');
    } else {
      this.props.search(this.state.text);
    }
  },
  selectExisting: function(name) {
    this.setState({text: name});
    this.props.search(name);
  },
  handleChange: function(e) {
    if (e.target.value === '') {
      this.clear(e);
    } else {
      this.setState({text: e.target.value});
    }
  },
  render: function() {
    return <div>
      <label className='sr-only' htmlFor='namespace-entry'>Enter namespace</label>
      <form action='#'>
      <div className='input-group'>
      <input 
          onChange={this.handleChange}
          id='namespace-search-entry'
          className='form-control'
          type='text'
          ref='namespaceSearchEntry'
          value={this.state.text}
          placeholder='Enter namespace' />
      <span className='input-group-btn'>
        <button className='btn btn-primary' onClick={this.search}>
          <span className='glyphicon glyphicon-search'></span> Search
        </button>
        <SelectExisting error={this.props.error} select={this.selectExisting} />
        <button className='btn btn-default' onClick={this.clear}>Clear</button>
      </span>
      </div>
      </form>
    </div>;

  }
});

var SelectExisting = React.createClass({
  getInitialState: function() {
    return {
      namespaces: [],
      continuationToken: null,
      loading: true
    };
  },
  componentDidMount: function() {
    this.load();
  },
  select: function(e) {
    this.props.select(e.currentTarget.getAttribute('data-namespace'));
  },
  load: function() {
    var index = new window.taskcluster.index();
    var payload = {};
    if (this.state.continuationToken) {
      payload.continuationToken = this.state.continuationToken; 
    } else {
      // We reset so that we don't continuously append.  This could
      // be racing with the next setState on success, but let's focus
      // on something more important than non-harmful duplicate entries
      this.setState({namespaces: []});
    }
    //Is there a better way to list all namespaces?
    index.listNamespaces('', payload)
      .then(function(result) {
        this.setState({
          namespaces: this.state.namespaces.concat(result.namespaces),
          continuationToken: result.continuationToken,
          loading: false,
        });
      }.bind(this))
      .then(null, function(error) {
        this.setState({loading: false});
        this.props.error('Error loading existing values');
      }.bind(this));
  },
  render: function() {
    var label = <span>Select Existing</span>
    if (this.state.loading) {
      label = <span><span className='glyphicon glyphicon-refresh'></span> Select Existing</span>
    }
    var list = this.state.namespaces.map(function(ns) {
      return <li
                data-name={ns.name}
                data-namespace={ns.namespace}
                data-expires={ns.expires}
                key={ns.namespace}
                onClick={this.select}><a href='#'>{ns.name}</a>
             </li>;
    }, this);
    // Quick hack from http://stackoverflow.com/a/19229738
    var style = {
      height: 'auto',
      'max-height': '500px',
      'overflow-x': 'hidden',
    };
    return <div className='btn-group'>
           <button className='btn btn-primary dropdown-toggle' data-toggle='dropdown'>
             {label}<span className='caret'></span></button>
           <ul className='dropdown-menu scrollable-menu' role='menu' style={style}>{list}</ul>
           </div>
  }
});

var ComponentThatGoesPing = React.createClass({
  getInitialState: function(){
    return {
      alive: null,
      uptime: null
    };
  },
  pingServer: function() {
    var index = new window.taskcluster.index();
    index.ping().then(function(result) {
      console.log(result);
      this.setState(result);
    }.bind(this))
  },
  render: function() {
    return <div>
      <h2>Ping!<small>check if the indexing server is up</small></h2>
      <PingButton handler={this.pingServer} />
      <PingResult alive={this.state.alive} uptime={this.state.uptime} />
    </div>;
  }
});

var PingButton = React.createClass({
  render: function() {
    return <button onClick={this.props.handler} className='btn btn-primary'>
          <span className='glyphicon glyphicon-signal'></span> Ping Server
          </button>;
  }
});

var PingResult = React.createClass({
  render: function() {
    var alive = this.props.alive;
    var string = 'is untested';
    if (alive !== null) {
      if (alive) {
        var date = new Date(this.props.uptime * 1000 + Date.now());
        string = 'has been up for ' + humaneDate(date);
      } else {
        string = 'is down';
      }
    }
    return <div className='alert alert-info'>Server {string}</div>;
  }
});

// Render Browser
React.renderComponent(<IndexBrowser />, document.getElementById('index-browser'));

// End module
})(this);
