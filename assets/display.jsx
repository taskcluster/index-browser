/** @jsx React.DOM */
(function(exports) {
'use strict';

// Widget to show monitors
var IndexBrowser = React.createClass({
  render: function() {
    return (
        <div>
        <TaskBrowser />
        <ComponentThatGoesPing />
        </div>
    );
  }
});

var TaskBrowser = React.createClass({
  getInitialState: function() {
    var hashLoc = window.location.hash.slice(1);
    if (hashLoc && hashLoc.slice(hashLoc.length - 1) === '.') {
      hashLoc = hashLoc.slice(0, hashLoc.length - 1);
      window.location.hash = hashLoc;
    }
    return {
      namespace: hashLoc ? hashLoc : null,
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
    window.location.hash = namespace;
    this.setState({namespace: namespace, error: null});
  },
  render: function() {
    return <div>
      <h2>Search for Namespace</h2>
      <NamespaceSearchEntry initialText={this.state.namespace || ''} search={this.select} clear={this.clear} error={this.error} />  
      {this.state.error ? <ErrorBar error={this.state.error} /> : ''}
      {!this.state.error && this.state.namespace ? <NamespaceList select={this.select} namespace={this.state.namespace} /> : ''}
      {!this.state.error && this.state.namespace ? <TaskList namespace={this.state.namespace} /> : ''}
      </div>
  }
});

var NamespaceSearchEntry = React.createClass({
  getInitialState: function(){
    return {
      error: null,
      text: '',
    }
  },
  componentWillReceiveProps: function(newProps) {
    if (this.props.initialText !== newProps.initialText) {
      this.setState({text: newProps.initialText});
    }
  },
  error: function (error) {
    this.props.error(error);
  },
  clear: function(e) {
    e.preventDefault();
    this.replaceState(this.getInitialState());
    this.props.clear();
  },
  search: function(e) {
    e.preventDefault();
    if (this.state.text === '') {
      this.error('To do a search, you must first enter a namespace');
    } else {
      this.props.search(this.state.text);
    }
  },
  selectExisting: function(name) {
    this.setState({text: name, error: null});
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
      loading: true
    };
  },
  componentDidMount: function() {
    this.load();
  },
  select: function(e) {
    e.preventDefault();
    this.props.select(e.currentTarget.getAttribute('data-namespace'));
  },
  load: function() {
    var index = new window.taskcluster.index();
    var payload = {};
    //Is there a better way to list all namespaces?
    index.listNamespaces('', payload)
      .then(function(result) {
        this.setState({
          namespaces: result.namespaces,
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
      label = <span><span className='glyphicon glyphicon-refresh'></span> {label}</span>
    } else {
      label = <span>{label}</span>
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
             {label} <span className='caret'></span></button>
           <ul className='dropdown-menu scrollable-menu' role='menu' style={style}>{list}</ul>
           </div>
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
  loadMore: function() {
    var index = new window.taskcluster.index();
    var payload = {};

    index.listTasks(this.props.namespace, payload)
      .then(function(result) {
        this.setState({
          loading: false,
          tasks: result.tasks,
          error: null,
        });
      }.bind(this))
      .then(null, function(error) {
        this.setState({loading: false, error: error});
      }.bind(this));

  },
  componentDidMount: function () {
    this.loadMore();
  },
  componentDidUpdate: function (prevProps) {
    if (prevProps.namespace !== this.props.namespace) {
      console.log('Resetting component because we have a new namespace');
      this.reset();
    }
  },
  reset: function () {
    console.log('Resetting tasks');
    this.replaceState(this.getInitialState());
    this.loadMore();
  },
  render: function() {
    var resetButton = <ResetButton handler={this.reset} what='tasks' />;
    var header = <h3> Tasks for {this.props.namespace}</h3>;
    var result;
    if (this.state.error) {
      result = <ErrorBar error={this.state.error} />;
    } else if (this.state.loading) {
      result = <LoadingBar />;
    } else if (this.state.tasks.length === 0) {
      result = <div className='alert alert-info'>No tasks were found</div>;
    } else {
      result = <div className='table-responsive'>
        <table className='table table-hover table-striped'>
          <thead><tr><th>Namespace</th><th>ID</th><th>Rank</th><th>Data</th><th>Expires</th></tr></thead>
          <tbody>
          {
            this.state.tasks.map(function (t) {
              return <TaskRow key={t.namespace} task={t} />;
            }, this)
          }
          </tbody>
        </table>
      </div>
    }
    return <div>{header}{result}{resetButton}</div>;
  }
});

var TaskRow = React.createClass({
  render: function() {
    var t = this.props.task;
    var dateObj = new Date(t.expires);
    var prettyExpiry = dateObj.toUTCString() + ' - ' + humaneDate(dateObj);
    return <tr key={t.namespace}>
             <td>{t.namespace}</td>
             <td><TaskInspectorLink id={t.taskId} /></td>
             <td>{t.rank}</td>
             <td><DataDisplayButton task={t} /></td>
             <td>{expiryTime(t.expires)}</td>
           </tr>;
  }
});

var NamespaceList = React.createClass({
  getInitialState: function() {
    return {
      childNamespaces: [],
      loading: true,
      error: null
    };
  },
  reset: function() {
    console.log('Resetting namespace list');
    this.replaceState(this.getInitialState());
    this.load();
  },
  load: function() {
    var index = new window.taskcluster.index(); 

    index.listNamespaces(this.props.namespace, {})
      .then(function(result) {
        this.setState({
          childNamespaces: result.namespaces,
          loading: false,
          error: null,
        });
      }.bind(this))
      .then(null, function(error) {
        this.setState({
          loading: false,
          error: error
        });
      }.bind(this));
  },
  componentDidMount: function() {
    this.load();
  },
  componentDidUpdate: function (prevProps) {
    if (prevProps.namespace !== this.props.namespace) {
      console.log('Resetting component because we have a new namespace');
      this.reset();
    }
  },
  render: function() {
    var resetButton = <ResetButton handler={this.reset} what='namespaces' />;
    var header = <h3>Namespaces for {this.props.namespace}</h3>;
    var result;
    if (this.state.error) {
      result = <ErrorBar error={this.state.error} />;
    } else if (this.state.loading) {
      result = <LoadingBar />;
    } else if (this.state.childNamespaces.length === 0) {
      result = <div className='alert alert-info'>No child namespaces found</div>;
    } else {
      result = <div className='table-responsive'>
        <table className='table table-hover table-stripped'>
          <thead><tr><th>Name</th><th>Expires</th></tr></thead>
          <tbody>
          {
            this.state.childNamespaces.map(function(ns) {
              return <NamespaceRow select={this.props.select} key={ns.namespace} ns={ns} />;
            }, this)
          }
          </tbody>
        </table>
      </div>;
    }

    return <div>{header}{result}{resetButton}</div>;
  }
});

var NamespaceRow = React.createClass({
  select: function(e) {
    this.props.select(e.currentTarget.getAttribute('data-namespace'));
  },
  render: function() {
    var ns = this.props.ns;
    return <tr onClick={this.select} data-namespace={ns.namespace}>
            <td>{ns.name}</td>
            <td>{expiryTime(ns.expires)}</td>
    </tr>;
  
  }
});

var LoadMoreTasksButton = React.createClass({
  render: function() {
    return <button className='btn btn-primary' onClick={this.props.handler}>Load More Tasks</button>;
  }
});

var ResetButton = React.createClass({
  render: function() {
    return <button className='btn btn-default' onClick={this.props.handler}>
            Reload{this.props.what ? ' ' + this.props.what : ''}</button>;
  }
});

var DataDisplayButton = React.createClass({
  render: function() {
    var title = this.props.task.namespace;
    var body = <TaskDisplay task={this.props.task} />;
    return <Modal openBtnLbl='Details' id={this.props.task.namespace} title={title} body={body} />
  }
});

var Modal = React.createClass({
  render: function () {
    // Get info out of props and set defaults
    var btnType = this.props.btnType || 'default';
    var rawId = this.props.id || 'bootstrap-modal';
    var openBtnLbl = this.props.openBtnLbl || 'Open';
    var closeBtnLbl = this.props.closeBtnLbl || 'Close';
    var saveBtnLbl = this.props.saveBtnLbl;
    var saveBtnAction = this.props.saveAction;
    var title = this.props.title;
    var body = this.props.body;

    // Figure things out
    var id = 'data-modal-' + rawId
        .replace(/[ ]/g, '_SPC_')
        .replace(/[.]/g, '_DOT_')
        .replace(/[:]/g, '_COL_');
    var hashId = '#' + id;
    var lblId = id + '-label';
    var btnCls = 'btn btn-' + btnType;

    // Should we have a save button?
    var saveBtn = '';
    if (saveBtnAction) {
      saveBtn = <button type="button" className="btn btn-primary" onClick={saveBtnAction}>{saveBtnLbl}</button>;
    }
    return <div>
            <button className={btnCls} data-toggle="modal" data-target={hashId}> Show Data</button>

            <div className="modal fade" id={id} tabIndex="-1" role="dialog" aria-labelledby={lblId} aria-hidden="true">
              <div className="modal-dialog">
                <div className="modal-content">
                  <div className="modal-header">
                    <button type="button" className="close" data-dismiss="modal">
                      <span aria-hidden="true">&times;</span>
                      <span className="sr-only">Close</span>
                    </button>
                    <h4 className="modal-title" id="{lblId}">{title}</h4>
                  </div>
                  <div className="modal-body">
                  {body}
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-default" data-dismiss="modal">{closeBtnLbl}</button>
                    {saveBtn}
                  </div>
                </div>
              </div>
            </div>
          </div>;
  }
});

function expiryTime(str) {
    var d = new Date(str);
    return '' +
      d.getUTCDate() + '.' + 
      d.getUTCMonth() + '.' +
      d.getUTCFullYear() + ' ' +
      d.getUTCHours() + ':' +
      d.getUTCMinutes() + ' ' + 
      '(' + humaneDate(d) + ')';
}

var TaskDisplay = React.createClass({
  render: function() {
    var task = this.props.task;
    return <span>
      <h5>Defined Data</h5>
      <ul className="list-group">
        <li className="list-group-item">Namespace: {task.namespace}</li>
        <li className="list-group-item">Task ID: <TaskInspectorLink id={task.taskId} /></li>
        <li className="list-group-item">Rank: {task.rank}</li>
        <li className="list-group-item">Expiration: {expiryTime(task.expires)}</li>
      </ul>
      <h5>Arbitrary Data</h5>
      <pre><code>{window.linkify(JSON.stringify(task.data, null, 2))}</code></pre>
      <h5>API Location</h5>
      <FindTaskAPILink taskname={task.namespace} />
    </span>;
  }
});

var FindTaskAPILink = React.createClass({
  render: function() {
    var apiUri = 'https://index.taskcluster.net/v1/task/' + this.props.taskname;
    return <code><a target='_blank' href={apiUri}>{apiUri}</a></code>;
  }
});

var ErrorBar = React.createClass({
  render: function() {
    return <div className='alert alert-danger'>
      <span className='glyphicon glyphicon-exclamation-sign'></span> 
      <strong>ERROR</strong> {this.props.error.message || this.props.error}
      {this.props.error.stack ? <pre>{this.props.error.stack}</pre> : ''}
    </div>;
  }
});

var LoadingBar = React.createClass({
  render: function() {
    return <div className='alert alert-info'>
            <span className='glyphicon glyphicon-refresh'></span> Loading...
    </div>;
  }
});

var NamespaceInfo = React.createClass({
  render: function() {
    return <p>Information for namespace {this.props.namespace}</p>;
  }
});

var TaskInspectorLink = React.createClass({
  render: function() {
    var link = 'http://docs.taskcluster.net/tools/task-inspector/#' + this.props.id;
    return <a href={link} target='_blank'>{this.props.id}</a>;
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
      <h2>Ping</h2>
      <PingResult alive={this.state.alive} uptime={this.state.uptime} />
      <PingButton handler={this.pingServer} />
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
